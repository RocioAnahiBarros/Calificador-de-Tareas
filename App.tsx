import React, { useState, useCallback } from 'react';
import { generateReport } from './services/geminiService';
import { DocumentIcon, UploadIcon, UserIcon, CheckCircleIcon, XCircleIcon, PrinterIcon, SparklesIcon, PlusIcon, ClipboardIcon } from './components/Icons';
import InputSwitcher from './components/InputSwitcher';
import ReactMarkdown from 'https://esm.sh/react-markdown@9';
import remarkGfm from 'https://esm.sh/remark-gfm@4';
import * as pdfjsLib from 'https://esm.sh/pdfjs-dist@4.4.168/build/pdf.mjs';

// Configure the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.4.168/build/pdf.worker.mjs';


type Step = 'instructions' | 'rubric' | 'studentName' | 'submission' | 'generating' | 'report';

interface FileState {
  file: File | null;
  content: string;
}

// Carga inicial desde localStorage
let initialInstructionsContent = '';
let initialInstructionsName = '';
let initialRubricContent = '';
let initialRubricName = '';

try {
  initialInstructionsContent = localStorage.getItem('assignmentInstructionsContent') || '';
  initialInstructionsName = localStorage.getItem('assignmentInstructionsName') || '';
  initialRubricContent = localStorage.getItem('assignmentRubricContent') || '';
  initialRubricName = localStorage.getItem('assignmentRubricName') || '';
} catch (e) {
  console.error("No se pudo acceder a localStorage:", e);
}


const App: React.FC = () => {
  const [step, setStep] = useState<Step>('instructions');
  const [studentName, setStudentName] = useState('');
  const [instructions, setInstructions] = useState<FileState>({
    file: initialInstructionsName ? new File([initialInstructionsContent], initialInstructionsName) : null,
    content: initialInstructionsContent,
  });
  const [rubric, setRubric] = useState<FileState>({
    file: initialRubricName ? new File([initialRubricContent], initialRubricName) : null,
    content: initialRubricContent
  });
  const [submission, setSubmission] = useState<FileState>({ file: null, content: '' });
  const [report, setReport] = useState('');
  const [error, setError] = useState<string | null>(null);

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
      fullText += pageText + '\n\n'; // Add newlines between pages
    }
    return fullText;
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (fileExtension === 'pdf') {
        extractTextFromPdf(file).then(resolve).catch(reject);
      } else if (fileExtension === 'txt' || fileExtension === 'md') {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
      } else {
        reject(new Error('Formato de archivo no soportado. Por favor, suba un .txt, .md o .pdf.'));
      }
    });
  };


  const updateStateWithFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<FileState>>
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const content = await readFileAsText(file);
        setter({ file, content });
      } catch (err: any) {
        setError(`Error al leer el archivo: ${err.message}`);
        console.error(err);
        // Reset file input
        e.target.value = '';
        setter(prevState => ({ ...prevState, file: null, content: prevState.file ? '' : prevState.content }));
      }
    }
  };

  const updateStateWithText = (
    text: string,
    setter: React.Dispatch<React.SetStateAction<FileState>>
  ) => {
    setter({ file: null, content: text });
  };

  const handleGenerateReport = useCallback(async () => {
    setError(null);
    setStep('generating');
    try {
      const generatedReport = await generateReport(
        studentName,
        instructions.content,
        rubric.content,
        submission.content
      );
      setReport(generatedReport);
      setStep('report');

      // Guardar la consigna y la rúbrica para futuras sesiones
      localStorage.setItem('assignmentInstructionsContent', instructions.content);
      if (instructions.file) {
        localStorage.setItem('assignmentInstructionsName', instructions.file.name);
      } else {
        localStorage.removeItem('assignmentInstructionsName');
      }
      localStorage.setItem('assignmentRubricContent', rubric.content);
      if (rubric.file) {
        localStorage.setItem('assignmentRubricName', rubric.file.name);
      } else {
        localStorage.removeItem('assignmentRubricName');
      }

    } catch (err: any) {
      setError(`Error al generar el informe: ${err.message}`);
      setStep('submission'); // Vuelve al paso anterior en caso de error
    }
  }, [studentName, instructions.content, rubric.content, submission.content]);

  const startNewEvaluation = () => {
    localStorage.removeItem('assignmentInstructionsContent');
    localStorage.removeItem('assignmentInstructionsName');
    localStorage.removeItem('assignmentRubricContent');
    localStorage.removeItem('assignmentRubricName');
    setStudentName('');
    setInstructions({ file: null, content: '' });
    setRubric({ file: null, content: '' });
    setSubmission({ file: null, content: '' });
    setReport('');
    setError(null);
    setStep('instructions');
  };
  
  const evaluateAnotherStudent = () => {
      setStudentName('');
      setSubmission({ file: null, content: '' });
      setReport('');
      setError(null);
      setStep('studentName');
  };

  const renderStepContent = () => {
    switch (step) {
      case 'instructions':
        return (
          <StepComponent
            title="Consigna de la Tarea"
            icon={<DocumentIcon />}
            onNext={() => setStep('rubric')}
            nextDisabled={!instructions.content.trim()}
          >
            <InputSwitcher
              id="instructions"
              file={instructions.file}
              content={instructions.content}
              onTextChange={(text) => updateStateWithText(text, setInstructions)}
              onFileChange={(e) => updateStateWithFile(e, setInstructions)}
              textPlaceholder="Pegue o escriba la consigna de la tarea aquí..."
              fileLabel="Subir Archivo de Consigna (.txt, .md, .pdf)"
            />
          </StepComponent>
        );
      case 'rubric':
        return (
          <StepComponent
            title="Rúbrica de Evaluación"
            icon={<UploadIcon />}
            onNext={() => setStep('studentName')}
            nextDisabled={!rubric.content.trim()}
          >
             <InputSwitcher
              id="rubric"
              file={rubric.file}
              content={rubric.content}
              onTextChange={(text) => updateStateWithText(text, setRubric)}
              onFileChange={(e) => updateStateWithFile(e, setRubric)}
              textPlaceholder="Pegue o escriba la rúbrica aquí..."
              fileLabel="Subir Archivo de Rúbrica (.txt, .md, .pdf)"
            />
          </StepComponent>
        );
      case 'studentName':
        return (
          <StepComponent
            title="Nombre del Alumno"
            icon={<UserIcon />}
            onNext={() => setStep('submission')}
            nextDisabled={!studentName.trim()}
          >
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Ingrese el nombre completo del alumno"
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
            />
          </StepComponent>
        );
      case 'submission':
        return (
          <StepComponent
            title="Entrega del Alumno"
            icon={<UploadIcon />}
            onNext={handleGenerateReport}
            nextText="Generar Informe"
            nextIcon={<SparklesIcon/>}
            nextDisabled={!submission.file || !submission.content.trim()}
          >
            <InputSwitcher
                id="submission"
                file={submission.file}
                content={submission.content}
                onTextChange={() => {}} // No se permite texto para la entrega
                onFileChange={(e) => updateStateWithFile(e, setSubmission)}
                textPlaceholder=""
                fileLabel="Subir Archivo de Entrega (.txt, .md, .pdf)"
            />
          </StepComponent>
        );
      case 'generating':
        return (
          <div className="text-center p-8">
            <div className="flex justify-center items-center mb-4">
              <SparklesIcon className="w-12 h-12 text-indigo-500 animate-pulse-fast" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Generando Informe...</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2">La IA está analizando la entrega. Esto puede tomar un momento.</p>
          </div>
        );
      case 'report':
        return (
          <ReportView 
            report={report}
            studentName={studentName}
            onGradeAnother={evaluateAnotherStudent}
            onStartNew={startNewEvaluation}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
      <div className="w-full max-w-2xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-800 dark:text-slate-200">
            Calificador de Tareas con IA
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 mt-2">
            Optimice su proceso de calificación con retroalimentación inteligente.
          </p>
        </header>

        <main className="bg-white dark:bg-slate-800/50 rounded-2xl shadow-2xl shadow-slate-200/50 dark:shadow-black/20 backdrop-blur-lg border border-slate-200 dark:border-slate-700">
           {error && (
            <div className="bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-700 dark:text-red-200 p-4 m-4 rounded-r-lg" role="alert">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}
          <div className="p-6 sm:p-8">
            {renderStepContent()}
          </div>
        </main>
        
        <footer className="text-center mt-8 text-sm text-slate-500 dark:text-slate-400">
            <p>Desarrollado con la API de Gemini</p>
        </footer>
      </div>
    </div>
  );
};

interface StepComponentProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    onNext: () => void;
    nextText?: string;
    nextIcon?: React.ReactNode;
    nextDisabled: boolean;
}

const StepComponent: React.FC<StepComponentProps> = ({ title, icon, children, onNext, nextText = "Siguiente", nextIcon, nextDisabled }) => (
    <div>
        <div className="flex items-center gap-3 mb-6">
            <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-full text-indigo-600 dark:text-indigo-300">
                {icon}
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{title}</h2>
        </div>
        <div className="mb-6">
            {children}
        </div>
        <div className="flex justify-end">
            <button
                onClick={onNext}
                disabled={nextDisabled}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 transition-all duration-200"
            >
                {nextIcon}
                <span>{nextText}</span>
            </button>
        </div>
    </div>
);

interface ReportViewProps {
  report: string;
  studentName: string;
  onGradeAnother: () => void;
  onStartNew: () => void;
}

const ReportView: React.FC<ReportViewProps> = ({ report, studentName, onGradeAnother, onStartNew }) => {
    const [isCopied, setIsCopied] = React.useState(false);

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            const reportElement = document.getElementById('report-content');
            if (reportElement) {
                printWindow.document.write('<html><head><title>Informe de Calificación - ' + studentName + '</title>');
                printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
                printWindow.document.write('<style>body { font-family: sans-serif; padding: 2rem; } .prose { max-width: 100% !important; } </style>');
                printWindow.document.write('</head><body class="bg-white">');
                printWindow.document.write(`<h1>Informe de Evaluación para ${studentName}</h1>`);
                printWindow.document.write(reportElement.innerHTML);
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                printWindow.print();
            }
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(report).then(() => {
            setIsCopied(true);
            setTimeout(() => {
                setIsCopied(false);
            }, 2000);
        }).catch(err => {
            console.error("No se pudo copiar el texto: ", err);
        });
    };
    
    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                 <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Informe de Evaluación para {studentName}</h2>
                 <div className="flex items-center gap-2">
                    <button 
                        onClick={handleCopy} 
                        className={`flex items-center gap-2 px-4 py-2 font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-all duration-200 ${
                            isCopied
                            ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 ring-green-500'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 ring-indigo-500'
                        }`}
                        disabled={isCopied}
                    >
                        {isCopied ? <CheckCircleIcon className="w-5 h-5"/> : <ClipboardIcon className="w-5 h-5"/>}
                        <span>{isCopied ? '¡Copiado!' : 'Copiar Texto'}</span>
                    </button>
                    <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 transition-all duration-200">
                        <PrinterIcon />
                        <span>Imprimir</span>
                    </button>
                 </div>
            </div>
           
            <div id="report-content" className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 max-h-[50vh] overflow-y-auto">
                 <article className="prose prose-slate dark:prose-invert max-w-none">
                     <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
                 </article>
            </div>

            <div className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-6">
                <p className="text-center text-slate-600 dark:text-slate-400 mb-4">¿Qué te gustaría hacer ahora?</p>
                <div className="flex flex-col sm:flex-row justify-end gap-4">
                    <button onClick={onStartNew} className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 dark:focus:ring-offset-slate-900 transition-all duration-200">
                        <XCircleIcon />
                        <span>Iniciar Nueva Tarea</span>
                    </button>
                    <button onClick={onGradeAnother} className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 transition-all duration-200">
                        <PlusIcon />
                        <span>Calificar Otro Alumno</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default App;