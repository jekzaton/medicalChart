"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCw,
  UploadCloud,
  X,
} from "lucide-react";

type ImportError = {
  row: number;
  an?: string;
  hn?: string;
  message: string;
};

type ImportSummary = {
  total: number;
  created: number;
  updated: number;
  unchanged: number;
  skipped: number;
  failed: number;
  success: number;
};

type ImportNotice = {
  row: number;
  an?: string;
  hn?: string;
  message: string;
};

type ImportResult = {
  message?: string;
  summary?: ImportSummary;
  warnings?: ImportNotice[];
  errors?: ImportNotice[];
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const IMPORT_ENDPOINT = "/api/medical-charts/import";
const TEMPLATE_PATH = "/api/medical-charts/template";

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

const isExcelFile = (file: File) => {
  const allowedExtensions = [".xlsx", ".xls"];
  const fileName = file.name.toLowerCase();

  return allowedExtensions.some((extension) => fileName.endsWith(extension));
};

export default function ImportMedicalChart() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const validateAndSetFile = (selectedFile?: File) => {
    setResult(null);

    if (!selectedFile) return;

    if (!isExcelFile(selectedFile)) {
      toast.error("รองรับเฉพาะไฟล์ Excel .xlsx หรือ .xls เท่านั้น");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error("ไฟล์ต้องมีขนาดไม่เกิน 10MB");
      return;
    }

    setFile(selectedFile);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    validateAndSetFile(e.target.files?.[0]);
    e.target.value = "";
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    validateAndSetFile(e.dataTransfer.files?.[0]);
  };

  const handleImport = async () => {
    if (!file) {
      toast.warning("กรุณาเลือกไฟล์ Excel ก่อนนำเข้า");
      return;
    }

    try {
      setUploading(true);
      setResult(null);

      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post<ImportResult>(IMPORT_ENDPOINT, formData, {
        validateStatus: () => true,
        withCredentials: true,
      });

      if (res.status >= 400) {
        const message = res.data?.message || "นำเข้าข้อมูลไม่สำเร็จ";

        setResult({
          message,
          summary: res.data?.summary,
          errors: Array.isArray(res.data?.errors) ? res.data.errors : [],
        });

        toast.error(message);
        return;
      }

      const importResult: ImportResult = res.data ?? {};

      setResult(importResult);
      toast.success(importResult.message || "นำเข้าข้อมูลสำเร็จ 🎉");
    } catch (err) {
      console.error(err);

      toast.error("เกิดข้อผิดพลาดระหว่างนำเข้าไฟล์");

      setResult({
        message: "เกิดข้อผิดพลาดระหว่างนำเข้าไฟล์",
        errors: [],
      });
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
  };

  return (
    <div className="w-full text-slate-900 transition-colors dark:text-slate-100">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => router.push("/admin/medical-chart")}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-blue-500/50 dark:hover:bg-slate-800 dark:hover:text-blue-300"
        >
          <ArrowLeft size={16} />
          กลับหน้า Medical Chart
        </button>

        <div className="overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-2xl shadow-blue-100/70 transition-colors dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
          <div className="relative overflow-hidden bg-linear-to-r from-emerald-500 via-teal-500 to-blue-600 px-6 py-8 text-white md:px-10 dark:from-emerald-600 dark:via-teal-700 dark:to-blue-800">
            <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/10" />
            <div className="absolute right-24 -bottom-16 h-44 w-44 rounded-full bg-white/10" />

            <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                  <FileSpreadsheet className="h-8 w-8" />
                </div>

                <div>
                  <p className="text-sm font-medium text-emerald-50">
                    Medical Chart Import
                  </p>
                  <h1 className="mt-1 text-2xl font-bold md:text-3xl">
                    Import Excel
                  </h1>
                  <p className="mt-1 text-sm text-emerald-50">
                    อัปโหลดไฟล์ Excel เพื่อนำเข้าข้อมูล Medical Chart เข้าระบบ
                  </p>
                </div>
              </div>

              <a
                href={TEMPLATE_PATH}
                className="inline-flex items-center justify-center gap-2 self-start rounded-2xl bg-white/15 px-4 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25 md:self-auto"
              >
                <Download size={17} />
                ดาวน์โหลด Template
              </a>
            </div>
          </div>

          <div className="grid gap-8 p-6 md:grid-cols-12 md:p-10">
            <section className="md:col-span-8">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <UploadCloud size={20} />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-800 dark:text-slate-100">
                    เลือกไฟล์สำหรับนำเข้า
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    รองรับไฟล์ .xlsx และ .xls ขนาดไม่เกิน 10MB
                  </p>
                </div>
              </div>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`group cursor-pointer rounded-3xl border-2 border-dashed p-8 text-center transition md:p-10 ${
                  dragActive
                    ? "border-emerald-400 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-500/10"
                    : "border-slate-200 bg-slate-50/80 hover:border-emerald-300 hover:bg-emerald-50/60 dark:border-slate-700 dark:bg-slate-950/50 dark:hover:border-emerald-500/50 dark:hover:bg-emerald-500/10"
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-emerald-600 shadow-lg shadow-emerald-100 transition group-hover:scale-105 dark:bg-slate-800 dark:text-emerald-300 dark:shadow-black/20">
                  <FileSpreadsheet className="h-10 w-10" />
                </div>

                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  ลากไฟล์ Excel มาวางที่นี่
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  หรือคลิกเพื่อเลือกไฟล์จากเครื่องของคุณ
                </p>

                <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <UploadCloud size={15} />
                  Choose Excel File
                </div>
              </div>

              {file && (
                <div className="mt-5 rounded-3xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm dark:bg-slate-800 dark:text-emerald-300">
                        <FileText size={22} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-800 dark:text-slate-100">
                          {file.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {formatFileSize(file.size)} • พร้อมนำเข้า
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleReset}
                      disabled={uploading}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <X size={16} />
                      ลบไฟล์
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => router.push("/admin/medical-charts")}
                  className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  ยกเลิก
                </button>

                <button
                  type="button"
                  onClick={handleImport}
                  disabled={!file || uploading}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-emerald-500 to-teal-500 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:-translate-y-0.5 hover:from-emerald-600 hover:to-teal-600 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-emerald-950/40"
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <UploadCloud size={18} />
                  )}
                  {uploading ? "กำลังนำเข้า..." : "เริ่ม Import Excel"}
                </button>
              </div>
            </section>

            <aside className="space-y-5 md:col-span-4">
              <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-5 transition-colors dark:border-slate-800 dark:bg-slate-950/60">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                    <Database size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                      รูปแบบข้อมูล
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      คอลัมน์ที่ควรมีใน Excel
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  {[
                    "hn",
                    "an",
                    "fullname",
                    "regdate",
                    "dchdate",
                    "doctor_code",
                    "ward_name",
                    "status_chart",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                    >
                      <span className="font-mono text-xs">{item}</span>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                <div className="mb-3 flex items-center gap-2 font-semibold">
                  <AlertTriangle size={18} />
                  ข้อควรระวัง
                </div>
                <ul className="space-y-2 text-sm leading-6">
                  <li>• วันที่ควรเป็นรูปแบบวันที่จริงใน Excel</li>
                  <li>• doctor_code ต้องตรงกับรหัสแพทย์ในระบบ</li>
                  <li>• ward_name ต้องตรงกับ ward</li>
                  <li>• status_chart ใช้ค่า success หรือ warning</li>
                </ul>
              </div>

              {result && (
                <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                      <CheckCircle2 size={20} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                        ผลการ Import
                      </h3>

                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {result.message || "สรุปผลการนำเข้า"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <ResultBox
                      label="แถวทั้งหมด"
                      value={result.summary?.total}
                    />

                    <ResultBox
                      label="นำเข้าสำเร็จ"
                      value={result.summary?.success}
                    />

                    <ResultBox
                      label="เพิ่มใหม่"
                      value={result.summary?.created}
                    />

                    <ResultBox
                      label="อัปเดตข้อมูล"
                      value={result.summary?.updated}
                    />

                    <ResultBox
                      label="ข้ามแถว"
                      value={result.summary?.skipped}
                    />

                    <ResultBox label="ผิดพลาด" value={result.summary?.failed} />
                    <ResultBox
                      label="ข้อมูลเดิม"
                      value={result.summary?.unchanged}
                    />
                  </div>

                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                      <p className="mb-2 font-semibold">
                        รายการที่มีปัญหา ({result.errors.length})
                      </p>

                      <ul className="max-h-52 space-y-2 overflow-y-auto text-xs">
                        {result.errors.map((error, index) => (
                          <li
                            key={`${error.row}-${error.an ?? error.hn ?? index}`}
                            className="rounded-xl border border-red-100 bg-white/70 p-2 dark:border-red-500/20 dark:bg-slate-900/40"
                          >
                            <div className="flex flex-wrap gap-x-3 gap-y-1">
                              <span className="font-semibold">
                                แถวที่ {error.row}
                              </span>

                              {error.an && (
                                <span className="text-slate-600 dark:text-slate-300">
                                  AN: {error.an}
                                </span>
                              )}

                              {error.hn && (
                                <span className="text-slate-600 dark:text-slate-300">
                                  HN: {error.hn}
                                </span>
                              )}
                            </div>

                            <p className="mt-1">{error.message}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => router.push("/admin/medical-chart")}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    <RefreshCw size={16} />
                    กลับไปดูรายการ
                  </button>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultBox({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-700 dark:bg-slate-800">
      <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
        {Number(value || 0).toLocaleString()}
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}
