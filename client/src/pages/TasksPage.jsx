import TaskTable from "../components/tables/TaskTable.jsx";

export default function TasksPage({ analytics }) {
  if (!analytics) return null;
  return <TaskTable tasks={analytics.tasks} />;
}
