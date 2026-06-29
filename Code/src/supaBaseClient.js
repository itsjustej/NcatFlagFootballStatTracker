import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ofuczcccbvffeetkacoz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mdWN6Y2NjYnZmZmVldGthY296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNTM5OTAsImV4cCI6MjA5MzkyOTk5MH0.iYb7Fu5-tyeeagZEzALZgE0n20Z7RKzfpXjuH01VC8c'

export const supabase = createClient(supabaseUrl, supabaseKey)