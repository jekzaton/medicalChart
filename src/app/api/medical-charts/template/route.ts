import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

export async function GET() {
  const rows = [
    {
      hn: "123456",
      an: "670001",
      fullname: "นายทดสอบ ระบบ",
      regdate: "01/01/2567",
      dchdate: "05/01/2567",
      doctor_code: "D001",
      ward_name: "อายุรกรรม",
      num_date: 4,
      status_chart: "warning",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(rows);

  worksheet["!cols"] = [
    { wch: 15 },
    { wch: 15 },
    { wch: 25 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 20 },
    { wch: 12 },
    { wch: 15 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "medical_chart");

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="medical-chart-import-template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
