
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file || file.size === 0) {
      reject(new Error('Fitxer invàlid o buit.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const base64String = reader.result.split(',')[1];
        if (!base64String || base64String.length < 50) {
          reject(new Error('La imatge no s\'ha pogut carregar correctament (dades insuficients).'));
          return;
        }
        resolve(base64String);
      } else {
        reject(new Error('Format de lectura incorrecte.'));
      }
    };
    reader.onerror = (error) => reject(new Error('Error en llegir el fitxer: ' + error));
    
    // Fem servir un retard mínim per permetre que el navegador alliberi el handle del fitxer si s'acaba de pujar
    setTimeout(() => {
      try {
        reader.readAsDataURL(file);
      } catch (e) {
        reject(e);
      }
    }, 100);
  });
};
