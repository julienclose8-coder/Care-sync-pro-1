import React, { createContext, useState } from 'react';

export const AdminViewStateContext = createContext(null);
export default function AdminViewStateProvider({ children }) {
  const [store] = useState(() => ({ values: new Map(), listeners: new Set() }));
  return <AdminViewStateContext.Provider value={store}>{children}</AdminViewStateContext.Provider>;
}