import moment from "moment";
import "moment/locale/th";

moment.locale("th");

// ✅ วันที่แบบไทย เช่น 28 ก.พ. 2569
export const formatDate = (value?: string | Date) => {
  if (!value) return "-";

  const date =
    typeof value === "string" && value.length === 10
      ? new Date(`${value}T00:00:00`)
      : new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

// ✅ วันที่ + เวลา เช่น 28 ก.พ. 2569 13:45
export const formatDateTime = (value?: string | Date) => {
  if (!value) return "-";

  const date =
    typeof value === "string" && value.length === 10
      ? new Date(`${value}T00:00:00`)
      : new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

// ⏱ relative time เช่น 5 นาทีที่แล้ว
export const fromNow = (date: string | Date) => {
  return moment(date).fromNow();
};

// 🔥 ปัดเวลาเป็นต้นชั่วโมง
export const fromStartOfHour = (date: string | Date) => {
  return moment(date).startOf("hour").fromNow();
};

// 🔥 ปัดเวลาเป็นต้นวัน
export const fromStartOfDay = (date: string | Date) => {
  return moment(date).startOf("day").fromNow();
};

// 🧠 อัปเดตกี่...
export const timeAgo = (date: string | Date) => {
  return ` ${moment(date).fromNow()}`;
};

// 🚀 แบบเลือก precision ได้
export const timeAgoSmart = (
  date: string | Date,
  mode: "normal" | "hour" | "day" = "normal",
) => {
  if (mode === "hour") {
    return `อัปเดต ${moment(date).startOf("hour").fromNow()}`;
  }

  if (mode === "day") {
    return `อัปเดต ${moment(date).startOf("day").fromNow()}`;
  }

  return `อัปเดต ${moment(date).fromNow()}`;
};

export default moment;
