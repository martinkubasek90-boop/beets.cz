'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    const { error } = await supabase.storage
      .from('beats')
      .upload(`public/${Date.now()}-${file.name}`, file)

    setUploading(false)
    error ? alert('Chyba: ' + error.message) : alert('Beat nahraný!')
  }

  return (
    <div className="card-mpc mb-16">
      <h2 className="text-4xl font-black mb-8">NAHRAJ SVŮJ BEAT</h2>
      <input
        type="file"
        accept="audio/wav,audio/mp3"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="block w-full text-lg mb-6 file:btn-mpc file:border-0"
      />
      <button
        onClick={handleUpload}
        disabled={uploading || !file}
        className="btn-mpc w-full text-3xl"
      >
        {uploading ? 'NAHRÁVÁM...' : 'NAHRAJ'}
      </button>
    </div>
  )
}