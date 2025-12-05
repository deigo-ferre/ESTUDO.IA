import React from 'react';
import { CorrectionResult } from '../types';
import ResultCard from './ResultCard';

interface EssayCorrectionDemoProps {
    onDismiss: () => void;
}

const MOCK_ESSAY_TEXT = `O artigo 5º da Constituição Federal de 1988 assegura a todos os cidadãos brasileiros o direito à liberdade de expressão. No entanto, em pleno século XXI, essa garantia é frequentemente violada no ambiente digital, onde a disseminação de discursos de ódio e notícias falsas compromete a integridade do debate público e a própria democracia.
...
A polarização política e a fragilidade das instituições democráticas, amplificadas pela disseminação de conteúdos maliciosos, exigem uma resposta enérgica. É mister, portanto, que o Estado, em colaboração com as plataformas digitais, implemente mecanismos de moderação eficazes. A educação midiática, por sua vez, deve ser um pilar fundamental nas escolas, capacitando os jovens a discernir informações e a construir um ambiente virtual mais saudável e plural.`;

const MOCK_CORRECTION_RESULT: CorrectionResult = {
    nota_total: 920,
    competencias: [
        { nome: "C1 - Demonstra domínio da modalidade escrita formal da língua portuguesa.", nota: 160, feedback: "Bom domínio, com poucas falhas gramaticais, como a vírgula após 'no entanto'. Fique atento à regência de alguns verbos para maior precisão." },
        { nome: "C2 - Compreende a proposta de intervenção e aplica conceitos socioculturais.", nota: 200, feedback: "Excelente compreensão do tema, com repertório sociocultural pertinente (Constituição de 88). Aborda o assunto de forma completa e madura." },
        { nome: "C3 - Relaciona, organiza, interpreta informações, fatos e opiniões.", nota: 160, feedback: "A argumentação é boa, mas o desenvolvimento poderia ser mais aprofundado em alguns pontos, conectando melhor os argumentos com as soluções propostas." },
        { nome: "C4 - Demonstra conhecimento dos mecanismos linguísticos necessários para a construção da argumentação.", nota: 200, feedback: "Uso variado de conectivos e articuladores, garantindo a coesão textual. A progressão das ideias é fluida e lógica." },
        { nome: "C5 - Elabora proposta de intervenção que respeite os direitos humanos.", nota: 200, feedback: "Proposta de intervenção completa, com agente, ação, meio, finalidade e detalhamento, respeitando os direitos humanos. Muito bem elaborada!" },
    ],
    comentario_geral: "Sua redação apresenta um excelente nível de argumentação e domínio da estrutura dissertativa-argumentativa. O repertório sociocultural é bem aplicado e a proposta de intervenção, bastante detalhada. Pequenas falhas pontuais na C1 e C3 podem ser ajustadas para alcançar a nota máxima!",
    melhorias: [
        "Revisar o uso da vírgula em expressões adversativas como 'no entanto'.",
        "Aprofundar a conexão entre os argumentos e as propostas de solução, fortalecendo a C3.",
        "Atenção à clareza e concisão em algumas frases para evitar redundâncias e garantir fluidez."
    ],
};

const EssayCorrectionDemo: React.FC<EssayCorrectionDemoProps> = ({ onDismiss }) => {
    return (
        <div className="animate-fade-in pb-12">
            <div className="text-center mb-8 space-y-3">
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">Veja o Corretor de Redação em Ação!</h1>
                <p className="text-slate-600 text-lg max-w-2xl mx-auto">Esta é uma demonstração de como a IA corrige sua redação.</p>
            </div>

            <div className="bg-slate-50 rounded-2xl shadow-xl border border-slate-200 p-6 mb-8">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Redação de Exemplo:</h2>
                <div className="bg-white p-6 rounded-lg border border-slate-100 text-slate-700 leading-relaxed text-sm max-h-60 overflow-y-auto custom-scrollbar">
                    <pre className="whitespace-pre-wrap font-serif">{MOCK_ESSAY_TEXT}</pre>
                </div>
            </div>
            
            <ResultCard result={MOCK_CORRECTION_RESULT} onReset={onDismiss} onSave={() => alert("Função de salvar não disponível na demo. Envie sua própria redação!")} />

            <div className="flex justify-center mt-8">
                <button 
                    onClick={onDismiss} 
                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5"
                >
                    Entendi! Quero Corrigir Minha Redação
                </button>
            </div>
        </div>
    );
};

export default EssayCorrectionDemo;