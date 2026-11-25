import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import usePullToRefresh from '@/hooks/usePullToRefresh';

export default function PullToRefresh({ children, onRefresh, className, as: Tag = 'div' }) {
  const container = useRef(null);
  const mobile = useIsMobile();
  const { distance, refreshing, error } = usePullToRefresh(onRefresh, mobile, container);
  return <>
    {(distance > 5 || refreshing || error) && createPortal(<div role="status" aria-live="polite" data-refresh-indicator className="fixed top-14 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-b-lg border bg-background px-4 py-3 text-sm text-foreground shadow pointer-events-none">
      {refreshing ? <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" /> : <ArrowDown aria-hidden="true" className="h-5 w-5" />}
      {refreshing ? 'Refreshing…' : error || (distance >= 60 ? 'Release to refresh' : 'Pull to refresh')}
    </div>, document.body)}
    <Tag ref={container} data-pull-to-refresh={mobile ? 'true' : undefined} className={className}>{children}</Tag>
  </>;
}