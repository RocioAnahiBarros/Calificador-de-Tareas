import React, { useState } from 'react';
import { DocumentTextIcon, UploadIcon, CheckCircleIcon } from './Icons';

// --- FileUploader Component (colocated for simplicity) ---
interface FileUploaderProps {
  file: File | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({ file, onChange, label }) => (
  <div className="w-full">
    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
      <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
        {file ? (
          <>
            <CheckCircleIcon className="w-10 h-10 mb-3 text-green-500" />
            <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{file.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Haga clic para reemplazar el archivo</p>
          </>
        ) : (
          <>
            <UploadIcon className="w-10 h-10 mb-3 text-slate-400" />
            <p className="mb-2 text-sm text-slate-500 dark:text-slate-400"><span className="font-semibold">Haga clic para subir</span> o arrastre y suelte</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
          </>
        )}
      </div>
      <input type="file" className="hidden" onChange={onChange} accept=".txt,.md,.pdf" />
    </label>
  </div>
);

// --- InputSwitcher Component ---
type InputMode = 'text' | 'file';

interface InputSwitcherProps {
  file: File | null;
  content: string;
  onTextChange: (text: string) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  textPlaceholder: string;
  fileLabel: string;
  id: string; // for unique labels
}

const InputSwitcher: React.FC<InputSwitcherProps> = ({ file, content, onTextChange, onFileChange, textPlaceholder, fileLabel, id }) => {
  // El modo por defecto es 'file' si ya hay un archivo, si no, 'text'.
  const [mode, setMode] = useState<InputMode>(file ? 'file' : 'text');

  const isFileOnly = id === 'submission'; // La entrega del alumno solo puede ser archivo

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onTextChange(e.target.value);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Cuando un archivo es seleccionado, cambia a modo 'file' para mostrar el resultado.
    setMode('file');
    onFileChange(e);
  };
  
  if (isFileOnly) {
      return (
           <FileUploader
              file={file}
              onChange={handleFileChange}
              label={fileLabel}
            />
      )
  }

  return (
    <div>
      <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4" role="tablist" aria-label={`${id}-input-method`}>
        <button
          id={`${id}-text-tab`}
          role="tab"
          aria-selected={mode === 'text'}
          aria-controls={`${id}-text-panel`}
          onClick={() => setMode('text')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-t-md ${
            mode === 'text'
              ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-b-2 border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <DocumentTextIcon className="w-5 h-5" /> Pegar Texto
        </button>
        <button
          id={`${id}-file-tab`}
          role="tab"
          aria-selected={mode === 'file'}
          aria-controls={`${id}-file-panel`}
          onClick={() => setMode('file')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-t-md ${
            mode === 'file'
              ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-b-2 border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <UploadIcon className="w-5 h-5" /> Subir Archivo
        </button>
      </div>

      <div>
        {mode === 'text' && (
          <div id={`${id}-text-panel`} role="tabpanel" aria-labelledby={`${id}-text-tab`}>
            <textarea
              // Solo muestra contenido en el textarea si no hay un archivo cargado.
              // Esto evita mostrar el contenido de un archivo en el área de texto.
              value={file ? '' : content}
              onChange={handleTextChange}
              placeholder={textPlaceholder}
              rows={8}
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
            />
          </div>
        )}
        {mode === 'file' && (
          <div id={`${id}-file-panel`} role="tabpanel" aria-labelledby={`${id}-file-tab`}>
            <FileUploader
              file={file}
              onChange={handleFileChange}
              label={fileLabel}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default InputSwitcher;