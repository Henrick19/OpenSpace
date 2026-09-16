import fs from "node:fs";

import { createOpenSpaceClient } from "../openspace/client.js";
import { createUrlId } from "../openspace/urlId.js";

// Abort-aware wait used by mock progress and live pending-capture polling.
function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        reject(new DOMException("Cancelled", "AbortError"));
      },
      { once: true },
    );
  });
}

function safeErrorMessage(error) {
  if (error?.name === "AbortError") return "Upload cancelled.";
  return error instanceof Error ? error.message : "Upload failed.";
}

/**
 * Coordinates long-running uploads outside request handlers.
 * It owns mock/live execution, cancellation, retry and processing polling.
 */
export function createUploadCoordinator({ uploadRepository, environment }) {
  // One AbortController per active upload allows user-requested cancellation.
  const controllers = new Map();
  const client = environment.openSpace.mode === "live"
    ? createOpenSpaceClient(environment.openSpace)
    : null;

  async function removeLocalFile(uploadId, localFilePath) {
    if (!localFilePath) return;
    await fs.promises.rm(localFilePath, { force: true });
    uploadRepository.markLocalFileDeleted(uploadId);
  }

  async function simulateUpload(upload, signal) {
    // Mock mode exercises the UI and SQLite lifecycle without real credentials.
    const steps = 20;
    for (let step = 1; step <= steps; step += 1) {
      await delay(environment.openSpace.mockStepDelayMs, signal);
      uploadRepository.updateTransferProgress(upload.id, {
        bytesSent: Math.round((upload.fileSize * step) / steps),
        fileSize: upload.fileSize,
      });
    }
    uploadRepository.markSubmitted(upload.id, environment.openSpace.webUrl);
    await removeLocalFile(upload.id, upload.localFilePath);
    uploadRepository.markProcessing(upload.id);
    await delay(environment.openSpace.mockProcessingDelayMs, signal);
    uploadRepository.markCompleted(upload.id);
  }

  async function pollUntilProcessed(uploadId, captureId, signal) {
    const deadline = Date.now() + environment.openSpace.pollTimeoutMs;
    let pendingSeen = Boolean(uploadRepository.findById(uploadId)?.pendingSeen);
    while (Date.now() < deadline) {
      await delay(environment.openSpace.pollIntervalMs, signal);
      const upload = uploadRepository.findById(uploadId);
      if (!upload) return;
      // A capture must be observed as pending before its later disappearance can
      // safely be interpreted as completion. An initially empty result may only
      // mean OpenSpace has not registered the pending capture yet.
      const pendingCaptures = await client.getPendingCaptures(upload.siteId);
      const pending = pendingCaptures.find((item) => item.clientCaptureId === captureId);
      if (pending) {
        pendingSeen = true;
        uploadRepository.markPendingSeen(uploadId);
        continue;
      }
      if (pendingSeen) {
        uploadRepository.markCompleted(uploadId);
        return;
      }
      uploadRepository.markProcessing(uploadId);
    }
    throw new Error(
      "OpenSpace processing could not be confirmed before the status-check timeout. "
      + "Open the Singapore OpenSpace web application to verify the capture, then retry the status check.",
    );
  }

  async function performLiveUpload(upload, signal) {
    // Follow the private integration order exactly: session, metadata, register, PUT.
    const captureId = createUrlId();
    const remoteUploadId = `${createUrlId()}.insv`;
    uploadRepository.setRemoteIds(upload.id, captureId, remoteUploadId);

    await client.createCapture(upload, captureId);
    await client.attachMetadata(upload, captureId, remoteUploadId);
    await client.registerUpload(upload, remoteUploadId);
    await client.uploadFile(upload, remoteUploadId, {
      signal,
      onProgress: (bytesSent) => uploadRepository.updateTransferProgress(upload.id, {
        bytesSent,
        fileSize: upload.fileSize,
      }),
    });

    uploadRepository.markSubmitted(upload.id, environment.openSpace.webUrl);
    await removeLocalFile(upload.id, upload.localFilePath);
    uploadRepository.markProcessing(upload.id);
    await pollUntilProcessed(upload.id, captureId, signal);
  }

  async function start(uploadId) {
    if (controllers.has(uploadId)) return;
    const upload = uploadRepository.findById(uploadId, { includeLocalPath: true });
    if (!upload) throw new Error("Upload was not found.");
    if (!["staged", "uploading"].includes(upload.status)) return;
    if (!upload.localFilePath) throw new Error("The local INSV file is not available.");

    const controller = new AbortController();
    controllers.set(uploadId, controller);
    try {
      if (environment.openSpace.mode === "mock") {
        await simulateUpload(upload, controller.signal);
      } else {
        await performLiveUpload(upload, controller.signal);
      }
    } catch (error) {
      if (error?.name === "AbortError") uploadRepository.markCancelled(uploadId);
      else uploadRepository.markFailed(uploadId, safeErrorMessage(error));
    } finally {
      controllers.delete(uploadId);
    }
  }

  function startInBackground(uploadId) {
    // Detach work from the HTTP request so POST /uploads can return promptly.
    setImmediate(() => {
      start(uploadId).catch((error) => uploadRepository.markFailed(uploadId, safeErrorMessage(error)));
    });
  }

  function cancel(uploadId) {
    const upload = uploadRepository.findById(uploadId);
    if (!upload) throw new Error("Upload was not found.");
    if (!["staged", "uploading"].includes(upload.status)) {
      throw new Error("Only a staged or actively transferring upload can be cancelled.");
    }
    const controller = controllers.get(uploadId);
    if (controller) controller.abort();
    else uploadRepository.markCancelled(uploadId);
    return uploadRepository.findById(uploadId);
  }

  function retry(uploadId) {
    const existing = uploadRepository.findById(uploadId, { includeLocalPath: true });
    if (!existing) throw new Error("Upload was not found.");
    if (existing.localFilePath) {
      const upload = uploadRepository.prepareRetry(uploadId);
      startInBackground(uploadId);
      return upload;
    }
    if (client && existing.captureId && existing.localFileDeleted) {
      const upload = uploadRepository.prepareProcessingCheckRetry(uploadId);
      startProcessingCheckInBackground(uploadId, existing.captureId);
      return upload;
    }
    throw new Error("The local INSV file is unavailable and no submitted capture can be checked.");
  }

  function startProcessingCheckInBackground(uploadId, captureId) {
    if (controllers.has(uploadId)) return;
    const controller = new AbortController();
    controllers.set(uploadId, controller);
    setImmediate(() => {
      pollUntilProcessed(uploadId, captureId, controller.signal)
        .catch((error) => {
          if (error?.name !== "AbortError") {
            uploadRepository.markFailed(uploadId, safeErrorMessage(error));
          }
        })
        .finally(() => controllers.delete(uploadId));
    });
  }

  function resumeProcessingChecks() {
    // After a restart, resume only remote processing checks; uploaded files are gone.
    if (!client) return;
    for (const upload of uploadRepository.listForProcessingResume()) {
      if (!upload.captureId) continue;
      startProcessingCheckInBackground(upload.id, upload.captureId);
    }
  }

  return { cancel, resumeProcessingChecks, retry, startInBackground };
}
