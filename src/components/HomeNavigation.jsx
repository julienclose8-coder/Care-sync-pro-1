import React from 'react';
import { Link, matchPath, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomeNavigation() {
  const { pathname } = useLocation();
  if (pathname === '/' || matchPath('/clients/:id', pathname)) return null;
  return (
    <nav aria-label="Home navigation" className="safe-area-top sticky top-0 z-30 flex h-14 items-center border-b bg-background px-4">
      <Button asChild variant="ghost" size="sm">
        <Link to="/"><ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to home</Link>
      </Button>
    </nav>
  );
}