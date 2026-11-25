import React, { useState } from 'react';
import { LayoutDashboard, Users, CalendarDays, UserCog, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import useResetAdminTab from '@/hooks/useResetAdminTab';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'roster', label: 'Roster', icon: CalendarDays },
  { id: 'workers', label: 'Workers', icon: UserCog },
];
export default function BottomTabBar({ section, items, onNavigate, onReselect }) {
  const [open, setOpen] = useState(false);
  const resetTab = useResetAdminTab(onReselect);
  const more = items.filter(item => !TABS.some(tab => tab.id === item.id));
  const select = id => {
    setOpen(false);
    if (id === section) resetTab(id);
    onNavigate(id);
  };
  return <>
    <nav aria-label="Admin bottom navigation" className="bottom-tab-bar fixed bottom-0 inset-x-0 z-50 grid grid-cols-5 border-t bg-background px-2 py-2 md:hidden" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}>
      {TABS.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-current={section === id ? 'page' : undefined} onClick={() => select(id)} className={cn('flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-xs font-medium', section === id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}><Icon aria-hidden="true" className="h-5 w-5" />{label}</button>)}
      <button type="button" aria-expanded={open} aria-current={more.some(item => item.id === section) ? 'page' : undefined} onClick={() => setOpen(true)} className={cn('flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-xs font-medium', more.some(item => item.id === section) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}><MoreHorizontal aria-hidden="true" className="h-5 w-5" />More</button>
    </nav>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto rounded-t-xl">
        <SheetHeader><SheetTitle>More sections</SheetTitle><SheetDescription>Open another management section.</SheetDescription></SheetHeader>
        <div className="mt-4 grid grid-cols-1 gap-2">
          {more.map(({ id, label, icon: Icon }) => <Button key={id} type="button" variant={section === id ? 'secondary' : 'ghost'} className="min-h-[44px] justify-start" onClick={() => select(id)}><Icon aria-hidden="true" className="h-5 w-5" />{label}</Button>)}
        </div>
      </SheetContent>
    </Sheet>
  </>;
}