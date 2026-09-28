import { useState } from 'react';

export function useDrawer<T = any>() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<T | null>(null);

  const openDrawer = (itemData?: T) => {
    if (itemData !== undefined) setData(itemData);
    setIsOpen(true);
  };

  const closeDrawer = () => {
    setIsOpen(false);
    setData(null);
  };

  return {
    isOpen,
    data,
    openDrawer,
    closeDrawer,
  };
}
