<<<<<<< HEAD
import { useNavigate } from "react-router-dom";
function ReuseCard(card) {
  return (
    <div>
      <p>{card.title}</p>
      <h2>{card.value}</h2>
    </div>
  );
=======
/** Dashboard screen placeholder; its metrics and recent rows will use dashboardApi. */
export function DashboardPage() {
  return <p>This is Dashboard page.</p>;
>>>>>>> origin/main
}

export function DashboardPage() {
  const navigate = useNavigate();
  const summary = {
    totalUploads: 12,
    inProgress: 1,
    completed: 10,
    failed: 1,
  
    recentUploads: [
    {
      id: 1,
      dateTime: "1 Sep, 19:30",
      projectFloor: "Robotics Lab - L2",
      fileName: "morning.insv",
      status: "Uploading"
    },
    {
      id: 2,
      dateTime: "1 Sep, 18:10",
      projectFloor: "Robotics Lab - L2",
      fileName: "lab-route.insv",
      status: "Completed"
    },
    {
      id: 3,
      dateTime: "30 Aug, 16:40",
      projectFloor: "CD Compass - L1",
      fileName: "trial-01.insv",
      status: "Failed"
    }
  ]
};

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Upload activity from the local SQLite database</p>
      
      <button onClick={() => navigate("/captures/new")}>
        + New Upload
      </button>

      <ReuseCard
        title="Total Uploads"
        value={summary.totalUploads}
      />

      <ReuseCard
        title="In Progress"
        value={summary.inProgress}
      />

      <ReuseCard
        title="Completed"
        value={summary.completed}
      />

      <ReuseCard
        title="Failed"
        value={summary.failed}
      />

      <h2>Recent Uploads</h2>

      <table>
        <thead>
          <tr>
            <th>Date / Time</th>
            <th>Project / Floor</th>
            <th>File</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {summary.recentUploads.map((object) => (
            <tr key={object.id}>
              <td>{object.dateTime}</td>
              <td>{object.projectFloor}</td>
              <td>{object.fileName}</td>
              <td>{object.status}</td>
              <td>
                {object.status === "Uploading" && <span>Details</span>}
                {object.status === "Completed" && <span>Open OpenSpace</span>}
                {object.status === "Failed" && <span>Retry</span>}
            </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}