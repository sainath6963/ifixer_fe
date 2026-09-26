import { useGetAdminMediaQuery } from './admin-operations-api';
import { adminMediaPreview } from './admin-media';

export function AdminMediaPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (mediaId: string | undefined) => void;
}) {
  const media = useGetAdminMediaQuery({ page: 1, limit: 100, status: 'READY' });

  return (
    <fieldset className="admin-media-picker">
      <legend>{label}</legend>
      <label className="admin-media-picker__none">
        <input type="radio" checked={!value} onChange={() => onChange(undefined)} />
        No image
      </label>
      {media.isError ? <p>Media library could not be loaded.</p> : null}
      <div>
        {media.data?.items.map((asset) => (
          <label key={asset.id} data-selected={value === asset.id}>
            <input
              className="sr-only"
              type="radio"
              checked={value === asset.id}
              onChange={() => onChange(asset.id)}
            />
            <img src={adminMediaPreview(asset)} alt="" />
            <span>{asset.originalFilename}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
