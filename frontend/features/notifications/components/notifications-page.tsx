"use client";

import { useState } from "react";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { usePageState } from "@/hooks/use-page-state";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useMarkAllRead, useMarkRead, useNotifications, useUnreadCount } from "../hooks";

function NotificationList({ unread }: { unread: boolean }) {
  const { page, limit, setPage, setLimit } = usePageState(20);
  const q = useNotifications({ page, limit, unread });
  const markRead = useMarkRead();

  if (q.isLoading) return <div aria-busy="true" className="space-y-3"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const items = q.data?.data ?? [];
  if (items.length === 0) return <EmptyState icon={unread ? BellOff : Bell} title={unread ? "You're all caught up" : "No notifications yet"} description={unread ? "Nothing new needs your attention." : "Updates about your account will appear here."} />;

  return (
    <div className="space-y-4">
      <ul className="divide-y rounded-lg border bg-card">
        {items.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => !n.isRead && markRead.mutate(n.notificationId)}
              className={cn("flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none", !n.isRead && "bg-primary/5")}
              aria-label={`${n.notification.title}${n.isRead ? "" : " (unread — activate to mark as read)"}`}
            >
              <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", n.isRead ? "bg-transparent" : "bg-primary")} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className={cn("block text-sm", !n.isRead && "font-semibold")}>{n.notification.title}</span>
                <span className="block text-sm text-muted-foreground">{n.notification.body}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {q.data && <DataTablePagination {...q.data.meta} page={page} limit={limit} onPageChange={setPage} onLimitChange={setLimit} />}
    </div>
  );
}

export function NotificationsPage() {
  const [tab, setTab] = useState("all");
  const unread = useUnreadCount();
  const markAll = useMarkAllRead();
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Updates about your account, classes and requests."
        actions={<Button variant="outline" onClick={() => markAll.mutate()} loading={markAll.isPending} disabled={!unread.data}><CheckCheck aria-hidden="true" /> Mark all as read</Button>}
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Notification filter">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread{unread.data ? ` (${unread.data})` : ""}</TabsTrigger>
        </TabsList>
        <TabsContent value="all"><NotificationList unread={false} /></TabsContent>
        <TabsContent value="unread"><NotificationList unread /></TabsContent>
      </Tabs>
    </>
  );
}
