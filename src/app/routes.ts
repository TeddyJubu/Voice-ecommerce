import { createBrowserRouter } from "react-router";
import Layout from "./components/Layout";
import HomePage from "./components/HomePage";
import HistoryPage from "./components/HistoryPage";
import SettingsPage from "./components/SettingsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: HomePage },
      { path: "history", Component: HistoryPage },
      { path: "settings", Component: SettingsPage },
    ],
  },
]);
