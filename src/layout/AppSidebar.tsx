"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, X } from "lucide-react";

import { useSidebar } from "../context/SidebarContext";
import {
  ChevronDownIcon,
  DocsIcon,
  GridIcon,
  HorizontaLDots,
  UserCircleIcon,
} from "../icons/index";

type UserRole = "admin" | "user";

type NavSubItem = {
  name: string;
  path: string;
  pro?: boolean;
  new?: boolean;
  roles?: UserRole[];
};

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: NavSubItem[];
  roles?: UserRole[];
};

type LoginUser = {
  id?: number;
  username?: string | null;
  prefix?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  role?: string | null;
};

type CollapsedFlyout = {
  index: number;
  top: number;
};

const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    roles: ["admin", "user"],
    subItems: [
      {
        name: "Dashboard",
        path: "/admin/dashboard",
        roles: ["admin", "user"],
      },
      {
        name: "Doctor Top 10",
        path: "/admin/dashboard/top10-doctor",
        roles: ["admin"],
      },
    ],
  },
  {
    icon: <UserCircleIcon />,
    name: "จัดการผู้ใช้งาน",
    roles: ["admin"],
    subItems: [
      { name: "ผู้ใช้งาน", path: "/admin/users", roles: ["admin"] },
      { name: "แพทย์", path: "/admin/doctors", roles: ["admin"] },
    ],
  },
  {
    icon: <DocsIcon />,
    name: "Patient",
    roles: ["admin", "user"],
    subItems: [
      {
        name: "Patient Details",
        path: "/admin/medical-chart",
        roles: ["admin", "user"],
      },
      {
        name: "Patient Doctor",
        path: "/admin/doctor-chart",
        roles: ["admin"],
      },
    ],
  },
];

const getInitial = (value?: string | null) => {
  return value?.trim()?.charAt(0)?.toUpperCase() || "A";
};

const getDisplayName = (user: LoginUser | null) => {
  if (!user) return "Admin";

  const fullName = `${user.firstname || ""} ${user.lastname || ""}`.trim();
  return fullName || user.username || "Admin";
};

const getRoleLabel = (role?: string | null) => {
  if (role === "admin") return "ผู้ดูแลระบบ";
  if (role === "user") return "ผู้ใช้งาน";
  return role || "ผู้ใช้งาน";
};

export default function AppSidebar() {
  const { isExpanded, isMobileOpen, isHovered, setIsMobileOpen } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();

  const isCollapsed = !isExpanded && !isMobileOpen && !isHovered;
  const showText = !isCollapsed;

  const [currentUser, setCurrentUser] = useState<LoginUser | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [collapsedFlyout, setCollapsedFlyout] =
    useState<CollapsedFlyout | null>(null);

  const subMenuRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const menuButtonRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const flyoutRef = useRef<HTMLDivElement | null>(null);

  const [heights, setHeights] = useState<Record<number, number>>({});

  const currentRole: UserRole =
    currentUser?.role === "admin" ? "admin" : "user";

  const filteredNavItems = useMemo(() => {
    const mapPathByRole = (path?: string) => {
      if (currentRole !== "user") return path;

      if (path === "/admin/dashboard") return "/user/dashboard";
      if (path === "/admin/medical-chart") return "/user/medical-chart";

      return path;
    };

    return navItems
      .filter((item) => !item.roles || item.roles.includes(currentRole))
      .map((item) => {
        const mappedItem: NavItem = {
          ...item,
          path: mapPathByRole(item.path),
        };

        if (!item.subItems) return mappedItem;

        return {
          ...mappedItem,
          subItems: item.subItems
            .filter((sub) => !sub.roles || sub.roles.includes(currentRole))
            .map((sub) => ({
              ...sub,
              path: mapPathByRole(sub.path) || sub.path,
            })),
        };
      })
      .filter((item) => item.path || (item.subItems?.length ?? 0) > 0);
  }, [currentRole]);

  const displayName = getDisplayName(currentUser);
  const displayRole = getRoleLabel(currentUser?.role);
  const avatarInitial = getInitial(
    currentUser?.firstname || currentUser?.username,
  );

  const isActive = useCallback(
    (path: string) => {
      if (path === "/admin/dashboard") return pathname === path;
      return pathname === path || pathname.startsWith(`${path}/`);
    },
    [pathname],
  );

  const routeActiveIndex = useMemo(() => {
    return filteredNavItems.findIndex((item) => {
      if (item.path) return isActive(item.path);
      return item.subItems?.some((sub) => isActive(sub.path));
    });
  }, [filteredNavItems, isActive]);

  const isOpen = useCallback(
    (index: number) =>
      openIndex === index || (openIndex === null && routeActiveIndex === index),
    [openIndex, routeActiveIndex],
  );

  const closeMobile = () => {
    if (isMobileOpen) setIsMobileOpen(false);
  };

  const closeCollapsedFlyout = () => {
    setCollapsedFlyout(null);
  };

  const openCollapsedFlyout = (index: number) => {
    const button = menuButtonRefs.current[index];
    const rect = button?.getBoundingClientRect();

    const safeTop = rect
      ? Math.min(Math.max(rect.top - 8, 16), window.innerHeight - 230)
      : 112 + index * 56;

    setCollapsedFlyout((prev) =>
      prev?.index === index ? null : { index, top: safeTop },
    );
  };

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) return;

        const data = await res.json();
        setCurrentUser(data?.user ?? data);
      } catch (error) {
        console.error("FETCH CURRENT USER ERROR:", error);
      }
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  useEffect(() => {
    const nextHeights: Record<number, number> = {};

    Object.entries(subMenuRefs.current).forEach(([key, element]) => {
      if (element) nextHeights[Number(key)] = element.scrollHeight;
    });

    setHeights(nextHeights);
  }, [pathname, isExpanded, isHovered, showText, filteredNavItems]);

  useEffect(() => {
    if (!showText) setOpenIndex(null);
  }, [showText]);

  useEffect(() => {
    closeCollapsedFlyout();
  }, [pathname, isCollapsed]);

  useEffect(() => {
    if (!collapsedFlyout) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      const flyout = flyoutRef.current;
      const button = menuButtonRefs.current[collapsedFlyout.index];

      if (flyout?.contains(target) || button?.contains(target)) return;
      closeCollapsedFlyout();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCollapsedFlyout();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [collapsedFlyout]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/signin");
      router.refresh();
    }
  };

  const flyoutItem =
    collapsedFlyout && filteredNavItems[collapsedFlyout.index]?.subItems
      ? filteredNavItems[collapsedFlyout.index]
      : null;

  return (
    <>
      {isMobileOpen && (
        <button
          type="button"
          aria-label="ปิดเมนู"
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm transition-opacity lg:hidden"
        />
      )}

      <aside
        className="fixed top-0 left-0 z-50 flex h-screen flex-col overflow-hidden border-r border-slate-200/80 bg-white/95 shadow-xl shadow-slate-200/50 backdrop-blur-xl transition-all duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-950/95 dark:shadow-black/30"
        style={{ width: "var(--sidebar-width)" }}
      >
        <div className="flex h-24 shrink-0 items-center justify-between px-4">
          <Link
            href="/admin/dashboard"
            onClick={() => {
              closeMobile();
              closeCollapsedFlyout();
            }}
            className={`group flex min-w-0 items-center rounded-2xl transition ${
              isCollapsed ? "w-full justify-center" : "gap-3"
            }`}
          >
            {isCollapsed ? (
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
                <Image
                  src="/images/logo/yth_logo.png"
                  alt="TailAdmin"
                  fill
                  priority
                  sizes="44px"
                  className="object-contain"
                />
              </div>
            ) : (
              <>
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
                  <Image
                    src="/images/logo/yth_logo.png"
                    alt="TailAdmin icon"
                    fill
                    priority
                    sizes="44px"
                    className="object-contain"
                  />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-xl font-black tracking-tight text-slate-900 dark:text-white">
                    Medical Chart
                  </p>
                  <p className="mt-0.5 truncate text-xs font-medium text-slate-400 dark:text-slate-500">
                    Yangtalad Hospital
                  </p>
                </div>
              </>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 lg:hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="ปิด Sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-3 pb-3">
          <nav className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-1">
            <div
              className={`mb-3 flex items-center ${
                isCollapsed ? "justify-center" : "justify-between px-2"
              }`}
            >
              {showText ? (
                <p className="text-xs font-bold tracking-[0.18em] text-slate-400 uppercase dark:text-slate-500">
                  Menu
                </p>
              ) : (
                <span className="text-slate-400 dark:text-slate-500">
                  <HorizontaLDots />
                </span>
              )}
            </div>

            <ul className="space-y-1.5">
              {filteredNavItems.map((item, index) => {
                const activeGroup = item.subItems?.some((sub) =>
                  isActive(sub.path),
                );
                const activeSingle = item.path ? isActive(item.path) : false;
                const active = Boolean(activeGroup || activeSingle);
                const collapsedMenuActive = collapsedFlyout?.index === index;

                return (
                  <li key={item.name} className="relative">
                    {item.subItems ? (
                      <>
                        <button
                          ref={(element) => {
                            menuButtonRefs.current[index] = element;
                          }}
                          type="button"
                          aria-expanded={
                            isCollapsed ? collapsedMenuActive : isOpen(index)
                          }
                          aria-haspopup={isCollapsed ? "menu" : undefined}
                          onClick={() => {
                            if (isCollapsed) {
                              openCollapsedFlyout(index);
                              return;
                            }

                            setOpenIndex((prev) =>
                              prev === index ? null : index,
                            );
                          }}
                          className={`group relative flex h-12 w-full items-center rounded-2xl text-sm font-bold transition-all duration-200 ${
                            active || collapsedMenuActive
                              ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20"
                              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
                          } ${isCollapsed ? "justify-center px-0" : "gap-3 px-3"}`}
                        >
                          {active && !isCollapsed && (
                            <span className="absolute top-1/2 left-0 h-7 w-1 -translate-y-1/2 rounded-r-full bg-blue-600 dark:bg-blue-400" />
                          )}

                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                              active || collapsedMenuActive
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                                : "text-slate-400 group-hover:bg-white group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:bg-slate-800 dark:group-hover:text-slate-200"
                            }`}
                          >
                            {item.icon}
                          </span>

                          {showText && (
                            <span className="min-w-0 flex-1 truncate text-left">
                              {item.name}
                            </span>
                          )}

                          {showText && (
                            <ChevronDownIcon
                              className={`h-4 w-4 shrink-0 transition-transform duration-300 ${
                                isOpen(index) ? "rotate-180" : ""
                              }`}
                            />
                          )}

                          {isCollapsed && (
                            <CollapsedTooltip label={item.name} />
                          )}
                        </button>

                        {showText && (
                          <div
                            style={{
                              maxHeight: isOpen(index)
                                ? `${heights[index] || 240}px`
                                : "0px",
                            }}
                            className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
                          >
                            <div
                              ref={(element) => {
                                subMenuRefs.current[index] = element;
                              }}
                              className="pt-2 pb-1"
                            >
                              <ul className="ml-6 space-y-1 border-l border-slate-200 pl-4 dark:border-slate-800">
                                {item.subItems.map((sub) => {
                                  const subActive = isActive(sub.path);

                                  return (
                                    <li key={sub.path}>
                                      <Link
                                        href={sub.path}
                                        onClick={() => {
                                          closeMobile();
                                          closeCollapsedFlyout();
                                        }}
                                        className={`group/sub flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition ${
                                          subActive
                                            ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                                            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
                                        }`}
                                      >
                                        <span className="truncate">
                                          {sub.name}
                                        </span>
                                        <span
                                          className={`h-1.5 w-1.5 shrink-0 rounded-full transition ${
                                            subActive
                                              ? "bg-blue-600 dark:bg-blue-300"
                                              : "bg-slate-300 opacity-0 group-hover/sub:opacity-100 dark:bg-slate-600"
                                          }`}
                                        />
                                      </Link>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <Link
                        href={item.path || "#"}
                        onClick={() => {
                          closeMobile();
                          closeCollapsedFlyout();
                        }}
                        className={`group relative flex h-12 w-full items-center rounded-2xl text-sm font-bold transition-all duration-200 ${
                          active
                            ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20"
                            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
                        } ${isCollapsed ? "justify-center px-0" : "gap-3 px-3"}`}
                      >
                        {active && !isCollapsed && (
                          <span className="absolute top-1/2 left-0 h-7 w-1 -translate-y-1/2 rounded-r-full bg-blue-600 dark:bg-blue-400" />
                        )}

                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                            active
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                              : "text-slate-400 group-hover:bg-white group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:bg-slate-800 dark:group-hover:text-slate-200"
                          }`}
                        >
                          {item.icon}
                        </span>

                        {showText && (
                          <span className="min-w-0 flex-1 truncate text-left">
                            {item.name}
                          </span>
                        )}

                        {isCollapsed && <CollapsedTooltip label={item.name} />}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
            <div
              className={`mb-3 flex items-center rounded-3xl bg-slate-50 p-2 ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-800 ${
                isCollapsed ? "justify-center" : "gap-3"
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-linear-to-br from-blue-600 to-indigo-600 text-sm font-black text-white shadow-sm">
                {avatarInitial}
              </div>

              {showText && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                    {displayName}
                  </p>
                  <p className="truncate text-xs font-medium text-slate-400 dark:text-slate-500">
                    role: {displayRole}
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className={`group flex h-12 w-full items-center rounded-2xl text-sm font-bold text-red-600 transition hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300 ${
                isCollapsed ? "justify-center" : "gap-3 px-3"
              }`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 transition group-hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:group-hover:bg-red-500/20">
                <LogOut size={18} />
              </span>

              {showText && <span>ออกจากระบบ</span>}
              {isCollapsed && <CollapsedTooltip label="ออกจากระบบ" />}
            </button>
          </div>
        </div>
      </aside>

      {flyoutItem && collapsedFlyout && isCollapsed && (
        <div
          ref={flyoutRef}
          role="menu"
          style={{
            top: collapsedFlyout.top,
            left: "calc(var(--sidebar-width) + 0.75rem)",
          }}
          className="fixed z-60 w-64 overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-2xl ring-1 shadow-slate-300/60 ring-black/5 dark:border-slate-700 dark:bg-slate-950 dark:shadow-black/40 dark:ring-white/10"
        >
          <div className="mb-1 flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-3 dark:bg-slate-900">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
              {flyoutItem.icon}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-800 dark:text-slate-100">
                {flyoutItem.name}
              </p>
              <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                เลือกเมนูย่อย
              </p>
            </div>
          </div>

          <ul className="space-y-1">
            {flyoutItem.subItems?.map((sub) => {
              const subActive = isActive(sub.path);

              return (
                <li key={sub.path}>
                  <Link
                    href={sub.path}
                    onClick={() => {
                      closeMobile();
                      closeCollapsedFlyout();
                    }}
                    className={`flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-bold transition ${
                      subActive
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span className="truncate">{sub.name}</span>
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        subActive
                          ? "bg-blue-600 dark:bg-blue-300"
                          : "bg-slate-300 dark:bg-slate-700"
                      }`}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}

function CollapsedTooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute top-1/2 left-full z-50 ml-3 hidden -translate-y-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold whitespace-nowrap text-slate-700 opacity-0 shadow-xl shadow-slate-200/60 transition group-hover:flex group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:shadow-black/30">
      {label}
    </span>
  );
}
