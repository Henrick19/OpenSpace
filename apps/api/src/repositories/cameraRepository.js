function parseDeviceId(deviceId) {
  const separator = deviceId.lastIndexOf(":sn:");
  if (separator <= 0 || separator === deviceId.length - 4) return null;
  return {
    model: deviceId.slice(0, separator).trim(),
    serialNumber: deviceId.slice(separator + 4).trim(),
  };
}

function mapCamera(row) {
  if (!row) return null;
  return {
    deviceId: row.device_id,
    displayName: row.display_name,
    model: row.model,
    serialNumber: row.serial_number,
    status: row.status,
  };
}

/** Data-access layer for physical cameras approved for capture uploads. */
export function createCameraRepository(database) {
  function list({ includeInactive = false } = {}) {
    const rows = includeInactive
      ? database.prepare("SELECT * FROM cameras ORDER BY display_name").all()
      : database.prepare("SELECT * FROM cameras WHERE status = 'active' ORDER BY display_name").all();
    return rows.map(mapCamera);
  }

  function findByDeviceId(deviceId) {
    return mapCamera(database.prepare("SELECT * FROM cameras WHERE device_id = ?").get(deviceId));
  }

  function create({ deviceId, displayName }) {
    const identity = parseDeviceId(deviceId);
    if (!identity) throw new Error("Camera device ID must use CameraType:sn:SerialNumber format.");
    database.prepare(`
      INSERT INTO cameras (device_id, display_name, model, serial_number, status)
      VALUES (?, ?, ?, ?, 'active')
    `).run(deviceId, displayName, identity.model, identity.serialNumber);
    return findByDeviceId(deviceId);
  }

  function ensureDefault(deviceId) {
    const identity = parseDeviceId(deviceId);
    if (!identity || findByDeviceId(deviceId)) return;
    const serialSuffix = identity.serialNumber.slice(-6);
    create({
      deviceId,
      displayName: `${identity.model} · ${serialSuffix}`,
    });
  }

  return { create, ensureDefault, findByDeviceId, list };
}

export { parseDeviceId };
