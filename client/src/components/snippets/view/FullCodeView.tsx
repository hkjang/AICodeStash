import React, { useState } from 'react';
import { FileCode, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Snippet } from '../../../types/snippets';
import CategoryList from '../../categories/CategoryList';
import { getLanguageLabel, getUniqueLanguages } from '../../../utils/language/languageUtils';
import { FullCodeBlock } from '../../editor/FullCodeBlock';
import ReactMarkdown from 'react-markdown';

interface FullCodeViewProps {
  showTitle?: boolean;
  snippet: Snippet;
  onCategoryClick?: (category: string) => void;
  showLineNumbers?: boolean;
  className?: string;
  isModal?: boolean;
}

export const FullCodeView: React.FC<FullCodeViewProps> = ({
                                                            showTitle = true,
                                                            snippet,
                                                            onCategoryClick,
                                                            showLineNumbers = true,
                                                            className = '',
                                                            isModal = false,
                                                          }) => {
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const handleCategoryClick = (e: React.MouseEvent, category: string) => {
    e.preventDefault();
    onCategoryClick?.(category);
  };

  const generateCode = async () => {
    try {
      const response = await fetch('http://localhost:11434/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gemma3',
          messages: [
            {
              role: 'system',
              content: '당신은 코드 예제를 생성해주는 도우미입니다.',
            },
            {
              role: 'user',
              content: `제목: "${snippet.title}"\n설명: "${snippet.description ?? '설명 없음'}"\n위 정보를 기반으로 적절한 코드 예제를 생성해줘.`,
            },
          ],
          stream: false
        }),
      });

      const data = await response.json();
      const generated = data?.choices?.[0]?.message?.content ?? '';
      setGeneratedCode(generated);
    } catch (error) {
      console.error('코드 생성 실패:', error);
    }
  };


  const getRelativeUpdateTime = (updatedAt: string): string => {
    try {
      const updateDate = new Date(updatedAt);
      return formatDistanceToNow(updateDate);
    } catch (error) {
      console.error('업데이트 시간 변환 오류:', error);
      return 'Unknown';
    }
  };

  const containerClasses = isModal
      ? `overflow-hidden ${className}`
      : `bg-light-surface dark:bg-dark-surface rounded-lg overflow-hidden ${className}`;

  const fragments = snippet.fragments ?? [];

  return (
      <div className={containerClasses}>
        {!isModal && snippet.updated_at && (
            <div className="bg-light-hover/50 dark:bg-dark-hover/50 px-3 py-1.5 text-xs flex items-center justify-end">
              <div className="flex items-center gap-1 text-light-text-secondary dark:text-dark-text-secondary">
                <Clock size={12} />
                <span>{getRelativeUpdateTime(snippet.updated_at)} 이전</span>
              </div>
            </div>
        )}

        <div className={isModal ? 'p-2 pt-0' : 'p-4 pt-0'}>
          {showTitle && (
              <h1 className={`text-xl md:text-2xl font-bold text-light-text dark:text-dark-text ${isModal ? '' : 'mt-2'}`}>
                {snippet.title}
              </h1>
          )}

          <div
              className={`flex items-center gap-1 text-sm text-light-text-secondary dark:text-dark-text-secondary mt-${
                  showTitle ? '2' : '0'
              }`}
          >
            <FileCode size={14} />
            <span>{getUniqueLanguages(fragments)}</span>
          </div>

          <div className="text-sm text-light-text dark:text-dark-text mt-3">
            <ReactMarkdown className="markdown prose max-w-none">
              {snippet.description || 'No description available'}
            </ReactMarkdown>
          </div>

          <div className="mt-3">
            <CategoryList categories={snippet.categories} onCategoryClick={handleCategoryClick} variant="clickable" showAll />
          </div>

          <div className="mt-4">
            <button
                onClick={generateCode}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition duration-200"
            >
              코드 생성하기
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {fragments.map((fragment, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between text-xs text-light-text-secondary dark:text-dark-text-secondary mb-1 bg-light-hover/50 dark:bg-dark-hover/50 rounded px-3 h-7">
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      <FileCode size={12} />
                      <span className="truncate">{fragment.file_name}</span>
                    </div>
                    <span>{getLanguageLabel(fragment.language)}</span>
                  </div>
                  <FullCodeBlock code={fragment.code} language={fragment.language} showLineNumbers={showLineNumbers} />
                </div>
            ))}

            {generatedCode && (
                <div>
                  <div className="text-sm font-semibold mb-1 mt-6">AI가 생성한 코드</div>
                  <FullCodeBlock code={generatedCode} language="typescript" showLineNumbers />
                </div>
            )}
          </div>
        </div>
      </div>
  );
};

export default FullCodeView;
