"use client";

import { RoleSwitch } from "@/components/shared/role-switch";
import { PageHeader } from "@/components/shared/page-header";
import { BooksPanel } from "@/features/library/components/books-panel";

export default function BooksRoute() {
  return (
    <RoleSwitch
      views={{
        LIBRARIAN: (
          <>
            <PageHeader title="Books" description="The library catalogue. Click a book to see its copies." />
            <BooksPanel canManage />
          </>
        ),
      }}
    />
  );
}
