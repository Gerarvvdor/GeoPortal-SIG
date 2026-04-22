import { createClient } from '@supabase/supabase-js';

// Leer variables de entorno desde Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validar configuración
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '❌ Supabase no está configurado. Asegúrate de definir VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env'
  );
}

console.log('✅ Supabase configurado correctamente');
console.log('🔧 URL:', supabaseUrl);
console.log('🔒 Clave:', supabaseAnonKey ? 'PRESENTE' : 'NO PRESENTE');

// Crear cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Prueba de conexión (opcional)
supabase
  .from('medical_centers')
  .select('count', { count: 'exact', head: true })
  .then(({ count, error }) => {
    if (error) {
      console.error('❌ Error al conectar con Supabase:', error.message);
    } else {
      console.log(`📊 Conectado a Supabase. ${count} centros médicos encontrados.`);
    }
  })
  .catch((err) => {
    console.error('❌ Fallo en la conexión a Supabase:', err);
  });

supabase.auth
  .getSession()
  .then(({ data, error }) => {
    if (error) {
      console.error('❌ Error en autenticación:', error.message);
    } else if (data.session) {
      console.log('👤 Usuario autenticado:', data.session.user.email);
    } else {
      console.log('🔐 Sistema de autenticación listo.');
    }
  })
  .catch((err) => {
    console.error('❌ Fallo en autenticación:', err);
  });
