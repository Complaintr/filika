try {
  const saved = JSON.parse(localStorage.getItem("filika-workspace-v1") || "null");
  const preference = saved && ["light", "dark", "system"].includes(saved.theme) ? saved.theme : "light";
  const theme = preference === "system"
    ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : preference;
  document.documentElement.dataset.theme = theme;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.setAttribute("content", theme === "dark" ? "#0e0e10" : "#ffffff");
} catch {
  document.documentElement.dataset.theme = "light";
}