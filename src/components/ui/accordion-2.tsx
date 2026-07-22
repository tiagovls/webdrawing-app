'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionItemProps {
  value: string;
  title: string;
  content: React.ReactNode;
  isOpen: boolean;
  onToggle: (value: string) => void;
}

export const AccordionItem = ({ value, title, content, isOpen, onToggle }: AccordionItemProps) => {
  return (
    <div 
      className={`border rounded-2xl px-6 transition-all duration-300 bg-white border-surface-200 shadow-sm`}
    >
      <button
        onClick={() => onToggle(value)}
        className="w-full text-left flex justify-between items-center py-5 transition-colors text-dark-950 hover:text-brand-600"
      >
        <span className="text-lg font-semibold pr-4">{title}</span>
        <ChevronDown 
          className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 text-dark-400 ${
            isOpen ? 'transform rotate-180 text-brand-600' : ''
          }`}
        />
      </button>
      <div 
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="pb-5 text-dark-600 leading-relaxed text-sm">
          {content}
        </div>
      </div>
    </div>
  );
};

export interface AccordionData {
  value: string;
  title: string;
  content: React.ReactNode;
}

export default function FAQAccordion({ data }: { data: AccordionData[] }) {
  const [openItem, setOpenItem] = useState<string | null>(null);

  const handleToggle = (value: string) => {
    setOpenItem(openItem === value ? null : value);
  };

  return (
    <div className="space-y-4 w-full">
      {data.map((item) => (
        <AccordionItem
          key={item.value}
          value={item.value}
          title={item.title}
          content={item.content}
          isOpen={openItem === item.value}
          onToggle={handleToggle}
        />
      ))}
    </div>
  );
}
