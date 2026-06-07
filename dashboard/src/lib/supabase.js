import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function uploadFile(bucket, path, file) {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type,
  })
  if (error) throw error
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)
  return urlData.publicUrl
}

export async function getExperience(productId) {
  const { data, error } = await supabase
    .from('experiences')
    .select('*')
    .eq('product_id', productId)
    .single()
  if (error) throw error
  return data
}

export async function saveExperience(userId, productId, payload) {
  const { data, error } = await supabase
    .from('experiences')
    .upsert({ user_id: userId, product_id: productId, ...payload, updated_at: new Date().toISOString() }, {
      onConflict: 'product_id',
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getUserExperiences(userId) {
  const { data, error } = await supabase
    .from('experiences')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function deleteExperience(productId) {
  const { error } = await supabase.from('experiences').delete().eq('product_id', productId)
  if (error) throw error
}

export async function uploadMarkerMind(userId, productId, buffer) {
  const path = `${userId}/${productId}/marker.mind`
  const blob = new Blob([buffer], { type: 'application/octet-stream' })
  const { error } = await supabase.storage.from('markers').upload(path, blob, {
    upsert: true,
    contentType: 'application/octet-stream',
  })
  if (error) throw error
  const { data } = supabase.storage.from('markers').getPublicUrl(path)
  return data.publicUrl
}
