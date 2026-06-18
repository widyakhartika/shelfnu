export interface Category {
  id: string;
  label: string;
  categoryId: string;
}

// Category IDs from live iAssets system (shelfnu.blackeye.id)
export const CATEGORIES: Category[] = [
  { id: 'laptop',     label: 'Laptop',          categoryId: 'cmp3kdik401shb0fccb9435p2' }, // END USER DEVICES
  { id: 'monitor',    label: 'Monitor',          categoryId: 'cmp3kdik401shb0fccb9435p2' }, // END USER DEVICES
  { id: 'mouse',      label: 'Mouse',            categoryId: 'cmp3l9gn90mvkb0fctfrqyf2w' }, // PERIPHERALS CONSUMABLE
  { id: 'keyboard',   label: 'Keyboard',         categoryId: 'cmp3l9gn90mvkb0fctfrqyf2w' }, // PERIPHERALS CONSUMABLE
  { id: 'charger',    label: 'Charger',          categoryId: 'cmp3l9gn90mvkb0fctfrqyf2w' }, // PERIPHERALS CONSUMABLE
  { id: 'printer',    label: 'Printer',          categoryId: 'cmp3m0wsl1bw1b0fcb8hqqa1s' }, // OFFICE EQUIPMENT (mapped to FACILITY_OFFICE)
  { id: 'ups',        label: 'UPS',              categoryId: 'cmp3lcz6z0q4ob0fc5m6gnx4o' }, // POWER PORTABLE
  { id: 'network',    label: 'Network Device',   categoryId: 'cmp3l6mlr0kcab0fcf25c58z4' }, // NETWORK DEVICES
  { id: 'server',     label: 'Server',           categoryId: 'cmp3llz9u0yc3b0fcq07fjlmk' }, // IT COMPONENTS
  { id: 'software',   label: 'Software/Lisensi', categoryId: 'cmp3kdbba01kgb0fcc2wxxghk' }, // SOFTWARE DIGITAL
  { id: 'furniture',  label: 'Furniture',        categoryId: 'cmp3m0wt81bw2b0fcu16s3r0l' }, // FURNITURE
  { id: 'other',      label: 'Lainnya (IT)',     categoryId: 'cmp3kdij901sgb0fcow93pbce' }, // IT ASSETS
];

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function getCategoryByLabel(label: string): Category | undefined {
  return CATEGORIES.find((c) => c.label.toLowerCase() === label.toLowerCase());
}
