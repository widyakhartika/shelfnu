export interface Category {
  id: string;
  label: string;
  categoryId: string;
}

export const CATEGORIES: Category[] = [
  { id: 'laptop',   label: 'Laptop',   categoryId: 'cmqaxzz6b00njpq07n55acdkr' },
  { id: 'monitor',  label: 'Monitor',  categoryId: 'FILL_ME_MONITOR_CATEGORY_ID' },
  { id: 'mouse',    label: 'Mouse',    categoryId: 'FILL_ME_MOUSE_CATEGORY_ID' },
  { id: 'keyboard', label: 'Keyboard', categoryId: 'FILL_ME_KEYBOARD_CATEGORY_ID' },
  { id: 'charger',  label: 'Charger',  categoryId: 'FILL_ME_CHARGER_CATEGORY_ID' },
  { id: 'printer',  label: 'Printer',  categoryId: 'FILL_ME_PRINTER_CATEGORY_ID' },
  { id: 'ups',      label: 'UPS',      categoryId: 'FILL_ME_UPS_CATEGORY_ID' },
  { id: 'modem',    label: 'Modem',    categoryId: 'FILL_ME_MODEM_CATEGORY_ID' },
  { id: 'server',   label: 'Server',   categoryId: 'FILL_ME_SERVER_CATEGORY_ID' },
  { id: 'other',    label: 'Lainnya',  categoryId: 'FILL_ME_OTHER_CATEGORY_ID' },
];

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function getCategoryByLabel(label: string): Category | undefined {
  return CATEGORIES.find((c) => c.label.toLowerCase() === label.toLowerCase());
}
