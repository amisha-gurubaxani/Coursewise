const indiaDateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

export function formatDateTimeIST(value: string) {
  return indiaDateTimeFormatter.format(new Date(value));
}
