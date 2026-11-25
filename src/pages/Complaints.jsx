import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import ComplaintFilters from '@/components/complaints/ComplaintFilters';
import ComplaintList from '@/components/complaints/ComplaintList';
import ComplaintForm from '@/components/complaints/ComplaintForm';
import ComplaintDetail from '@/components/complaints/ComplaintDetail';
import PullToRefresh from '@/components/mobile/PullToRefresh';

export default function Complaints() {
  const urlParams = new URLSearchParams(window.location.search);
  const scope = urlParams.get('scope') === 'mine' ? 'mine' : 'all';
  const [filters,setFilters] = useState({complaint_type:'',status:'',priority:''});
  const [offset,setOffset] = useState(0);
  const [creating,setCreating] = useState(false);
  const [selected,setSelected] = useState(null);
  const [message,setMessage] = useState('');
  const {data,isPending,error,refetch} = useQuery({queryKey:['complaints',scope,filters,offset],queryFn:async () => (await api.functions.invoke('complaints',{action:'list',scope,offset,...filters})).data});
  const manager = !!data?.can_manage && scope !== 'mine';
  const changeFilter = (key,value) => {setFilters(f => ({...f,[key]:value}));setOffset(0);};
  const saved = record => {setSelected(record);setMessage('Review saved.');refetch();};
  return <PullToRefresh as="main" onRefresh={refetch} className="max-w-5xl mx-auto p-4 md:p-10 space-y-6">
    <div className="flex flex-wrap justify-between items-center gap-3"><div><h1 className="font-heading text-2xl md:text-3xl font-bold">{manager ? 'HR complaints workspace' : 'My complaints'}</h1><p className="text-muted-foreground text-sm mt-2">{manager ? 'Track internal and external complaints, follow-ups, and resolutions in one place.' : 'Submit a concern and see the progress of complaints you lodged.'}</p></div><Button disabled={isPending || !!error} onClick={() => {setMessage('');setCreating(true);}}>{manager ? 'Record complaint' : 'Submit a complaint'}</Button></div>
    {message && <p role="status" className="text-sm text-primary">{message}</p>}
    <ComplaintFilters filters={filters} onChange={changeFilter} />
    {isPending ? <div className="flex justify-center p-10"><Loader2 aria-label="Loading complaints" className="animate-spin text-primary" /></div> : error ? <div role="alert" className="space-y-3"><p className="text-destructive">Unable to load complaints.</p><Button variant="outline" onClick={() => refetch()}>Try again</Button></div> : <>
      <ComplaintList records={data.records} onOpen={record => {setSelected(record);setMessage('');}} />
      <div className="flex justify-between gap-3"><Button variant="outline" disabled={offset === 0} onClick={() => setOffset(o => Math.max(0,o-25))}>Previous</Button><p className="text-sm text-muted-foreground self-center">Page {offset/25+1}</p><Button variant="outline" disabled={!data.has_more} onClick={() => setOffset(o => o+25)}>Next</Button></div>
    </>}
    <Button asChild variant="outline"><Link to="/">Back to home</Link></Button>
    {creating && <ComplaintForm manager={manager} initialType={urlParams.get('type') === 'external' ? 'external' : 'internal'} onClose={() => setCreating(false)} onSaved={record => {setMessage(`Complaint submitted: ${record.reference}`);setOffset(0);setFilters({complaint_type:'',status:'',priority:''});refetch();}} />}
    {selected && <ComplaintDetail record={selected} manager={manager} onClose={() => setSelected(null)} onSaved={saved} />}
  </PullToRefresh>;
}