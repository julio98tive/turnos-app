'use client';

export default function SimplePage() {
  return (
    <div style={{ 
      padding: '50px', 
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>✅ Página Simple Funcionando</h1>
      <p>Esta página no usa hooks ni autenticación</p>
      <button onClick={() => alert('Funciona!')}>
        Probar Interacción
      </button>
    </div>
  );
}