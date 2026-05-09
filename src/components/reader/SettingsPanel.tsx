import type { AppSettings } from '../../types'
import Modal from '../ui/Modal'
import Select from '../ui/Select'

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
  settings: AppSettings
  onUpdate: (s: Partial<AppSettings>) => void
}

export default function SettingsPanel({ open, onClose, settings, onUpdate }: SettingsPanelProps) {
  return (
    <Modal open={open} onClose={onClose} title="Reader Settings" size="sm">
      <div className="p-5 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Image Quality</label>
          <Select
            value={settings.imageQuality}
            onChange={(v) => onUpdate({ imageQuality: v as 'high' | 'data-saver' })}
            options={[
              { value: 'high', label: 'High quality' },
              { value: 'data-saver', label: 'Data saver' },
            ]}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Page Fit</label>
          <Select
            value={settings.pageFit}
            onChange={(v) => onUpdate({ pageFit: v as 'width' | 'height' | 'original' })}
            options={[
              { value: 'width', label: 'Fit width (recommended)' },
              { value: 'height', label: 'Fit height' },
              { value: 'original', label: 'Original size' },
            ]}
            className="w-full"
          />
        </div>
        <p className="text-xs text-gray-500 pt-1">
          Keyboard shortcuts: ← → chapter navigation · Esc back to manga
        </p>
      </div>
    </Modal>
  )
}
