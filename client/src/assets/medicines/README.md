# Named medicine images

`MedicineImage` automatically checks this directory for an image whose filename matches the medicine-name slug. Supported extensions are `.png`, `.jpg`, `.jpeg`, `.webp`, and `.svg`.

To make a filename, lowercase the medicine name and replace each group of non-alphanumeric characters with one hyphen. Examples:

- `Dolo 650mg Tablet` → `dolo-650mg-tablet.png`
- `Augmentin 625 Duo Tablet` → `augmentin-625-duo-tablet.webp`

Only add images you have permission to use. Images should represent the named product accurately. If no matching file exists—or it fails to load—the component uses `default-medicine.svg` and labels it as a generic illustration. Do not remove that default file.
