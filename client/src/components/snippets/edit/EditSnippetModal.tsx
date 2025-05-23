import React, { useState, useEffect } from 'react';
import 'prismjs';
import 'prismjs/components/prism-markup-templating.js';
import 'prismjs/themes/prism.css';
import { Plus } from 'lucide-react';
import { CodeFragment, Snippet } from '../../../types/snippets';
import Modal from '../../common/modals/Modal';
import CategoryList from '../../categories/CategoryList';
import CategorySuggestions from '../../categories/CategorySuggestions';
import { FragmentEditor } from './FragmentEditor';
import { Switch } from '../../../components/common/switch/Switch';

export interface EditSnippetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (snippetData: Omit<Snippet, 'id' | 'updated_at'>) => void;
  snippetToEdit: Snippet | null;
  showLineNumbers: boolean;
  allCategories: string[];
}

const EditSnippetModal: React.FC<EditSnippetModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  snippetToEdit,
  showLineNumbers,
  allCategories
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fragments, setFragments] = useState<CodeFragment[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryInput, setCategoryInput] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPublic, setIsPublic] = useState(snippetToEdit?.is_public || false);

  const generateCodeFromOllama = async () => {
    if (!title || !description) return;

    try {
      const response = await fetch('http://localhost:11434/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gemma3',
          messages: [
            {role: 'system', content: '사용자의 요구에 맞는 코드 스니펫을 작성하세요.'},
            {role: 'user', content: `제목: ${title}\n설명: ${description}`}
          ],
          stream: false
        }),
      });

      const data = await response.json();
      const code = data?.choices?.[0]?.message?.content || '';
      // CodeFragment 객체로 변환하여 업데이트
      const updatedFragment: CodeFragment = {
        file_name: 'generated_code',  // 코드의 파일 이름을 지정
        code: code,                   // 생성된 코드
        language: '',       // 코드 언어를 설정 (예: 'javascript')
        position: 0                   // 코드 위치 (프래그먼트의 순서)
      };

      handleUpdateFragment(0, updatedFragment); // 업데이트된 CodeFragment를 넘김
    }catch (error) {
      console.error('코드 생성 실패:', error);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setFragments([{
      file_name: 'main',
      code: '',
      language: '',
      position: 0
    }]);
    setCategories([]);
    setError('');
    setCategoryInput('');
  };

  useEffect(() => {
    if (isOpen) {
      if (snippetToEdit) {
        setTitle(snippetToEdit.title?.slice(0, 255) || '');
        setDescription(snippetToEdit.description || '');
        setFragments(JSON.parse(JSON.stringify(snippetToEdit.fragments || [])));
        setCategories(snippetToEdit.categories || []);
        setIsPublic(snippetToEdit.is_public || false);
      } else {
        resetForm();
      }
    }
  }, [isOpen, snippetToEdit]);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleCategorySelect = (category: string) => {
    const normalizedCategory = category.toLowerCase().trim();
    if (normalizedCategory && categories.length < 20 && !categories.includes(normalizedCategory)) {
      setCategories(prev => [...prev, normalizedCategory]);
    }
    setCategoryInput('');
  };

  const handleRemoveCategory = (e: React.MouseEvent, category: string) => {
    e.preventDefault();
    setCategories(cats => cats.filter(c => c !== category));
  };

  const handleAddFragment = () => {
    setFragments(current => [
      ...current,
      {
        file_name: `file${current.length + 1}`,
        code: '',
        language: '',
        position: current.length
      }
    ]);
  };

  const handleUpdateFragment = (index: number, updatedFragment: CodeFragment) => {
    setFragments(current => {
      const newFragments = [...current];
      newFragments[index] = updatedFragment;
      return newFragments;
    });
  };

  const handleDeleteFragment = (index: number) => {
    if (fragments.length > 1) {
      setFragments(current => current.filter((_, i) => i !== index));
    }
  };

  const moveFragment = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;

    if (toIndex < 0 || toIndex >= fragments.length) return;

    setFragments(current => {
      const newFragments = [...current];
      const [movedFragment] = newFragments.splice(fromIndex, 1);
      newFragments.splice(toIndex, 0, movedFragment);
      return newFragments.map((fragment, index) => ({
        ...fragment,
        position: index
      }));
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (fragments.length === 0) {
      setError('At least one code fragment is required');
      return;
    }

    if (fragments.some(f => !f.file_name.trim())) {
      setError('All fragments must have file names');
      return;
    }

    setIsSubmitting(true);
    const snippetData = {
      title: title.slice(0, 255),
      description: description,
      fragments: fragments.map((f, idx) => ({ ...f, position: idx })),
      categories: categories,
      is_public: isPublic ? 1 : 0
    };

    try {
      await onSubmit(snippetData);
      onClose();
    } catch (error) {
      setError('An error occurred while saving the snippet. Please try again.');
      console.error('Error saving snippet:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      expandable={true}
      title={
        <h2 className="text-xl font-bold text-light-text dark:text-dark-text">
          {snippetToEdit ? '코드조각 편집' : '새로운 코드조각 추가'}
        </h2>
      }
    >
      <style>
        {`
          .modal-footer {
            position: sticky;
            background: var(--footer-bg);
            border-top: 1px solid var(--footer-border);
            margin-top: 1rem;
            z-index: 100;
          }

          .modal-footer::before {
            content: '';
            position: absolute;
            bottom: 100%;
            left: 0;
            right: 0;
            height: 20px;
            background: linear-gradient(to top, var(--footer-bg), transparent);
            pointer-events: none;
          }

          .add-fragment-button {
            transition: all 0.2s ease-in-out;
          }

          .add-fragment-button:hover {
            transform: translateY(-1px);
          }

          :root {
            --footer-bg: var(--light-surface);
            --footer-border: var(--light-border);
          }

          .dark {
            --footer-bg: var(--dark-surface);
            --footer-border: var(--dark-border);
          }
        `}
      </style>
      <div className="flex flex-col h-full max-h-full relative isolate">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-none">
            {error && <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="space-y-4 pr-2">
              {/* Title input */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-light-text dark:text-dark-text">제목</label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                  className="mt-1 block w-full rounded-md bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text p-2 text-sm
                    border border-light-border dark:border-dark-border
                    focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-light-primary dark:focus:border-dark-primary"
                  required
                  placeholder="코드조각의 제목을 입력하세요. (최대 100 characters)"
                  maxLength={100}
                />
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">{title.length}/100 characters</p>
              </div>

              {/* Description input */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-light-text dark:text-dark-text">상세</label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 block w-full rounded-md bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text p-2 text-sm
                    border border-light-border dark:border-dark-border
                    focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-light-primary dark:focus:border-dark-primary"
                  rows={3}
                  placeholder="Write a short description of the snippet"
                />
              </div>

              {/* Categories section */}
              <div>
                <label htmlFor="categories" className="block text-sm font-medium text-light-text dark:text-dark-text">
                  카테고리 (최대 20개)
                </label>
                <CategorySuggestions
                  inputValue={categoryInput}
                  onInputChange={setCategoryInput}
                  onCategorySelect={handleCategorySelect}
                  existingCategories={allCategories}
                  selectedCategories={categories}
                  placeholder="Type a category and press Enter or comma"
                  maxCategories={20}
                  showAddText={true}
                  handleHashtag={false}
                  className="mt-1 block w-full rounded-md bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text p-2 text-sm
                    border border-light-border dark:border-dark-border
                    focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-light-primary dark:focus:border-dark-primary"
                />
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
                  {categories.length}/20 categories
                </p>
                <CategoryList
                  categories={categories}
                  onCategoryClick={handleRemoveCategory}
                  className="mt-2"
                  variant="removable"
                />
              </div>

              {/* Public snippet section */}
              <div className="space-y-1">
                <label className="flex items-center gap-2">
                  <Switch
                    id="isPublic"
                    checked={!!isPublic}
                    onChange={setIsPublic}
                  />
                  <span className="text-sm font-medium text-light-text dark:text-dark-text">코드조각 퍼블릭으로 변경</span>
                </label>
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  퍼블릭 코드조각은 인증 없이 익명의 사용자에게 노출됩니다.
                </p>
              </div>

              {/* Code Fragments section */}
              <div>
                <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-4">
                  코드 구성요소 ({fragments.length})
                </label>

                <div className="space-y-4">
                  {fragments.map((fragment, index) => (
                    <FragmentEditor
                      key={index}
                      fragment={fragment}
                      onUpdate={(updated) => handleUpdateFragment(index, updated)}
                      onDelete={() => handleDeleteFragment(index)}
                      showLineNumbers={showLineNumbers}
                      onMoveUp={() => moveFragment(index, 'up')}
                      onMoveDown={() => moveFragment(index, 'down')}
                      canMoveUp={index > 0}
                      canMoveDown={index < fragments.length - 1}
                    />
                  ))}

                  {/* New Add Fragment button positioned below fragments */}
                  <button
                    type="button"
                    onClick={handleAddFragment}
                    className="add-fragment-button w-full py-3 px-4 border-2 border-dashed border-light-border dark:border-dark-border rounded-lg
                             hover:border-light-primary dark:hover:border-dark-primary hover:bg-light-hover dark:hover:bg-dark-hover transition-all duration-200
                             flex items-center justify-center gap-2 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-primary dark:hover:text-dark-primary group"
                  >
                    <Plus size={20} className="transition-transform group-hover:scale-110" />
                    <span className="text-sm font-medium">신규 코드 구성요소 추가</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer -bottom-5 inset-x-0 mt-4 z-10">
            <div className="flex justify-end gap-2 py-4">
              <button
                  type="button"
                  onClick={generateCodeFromOllama}
                  className="px-4 py-2 bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text rounded-md
                  hover:bg-light-hover dark:hover:bg-dark-hover text-sm border border-light-border dark:border-dark-border">
                AI 코드 생성
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text rounded-md
                  hover:bg-light-hover dark:hover:bg-dark-hover text-sm border border-light-border dark:border-dark-border"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-light-primary dark:bg-dark-primary text-white rounded-md hover:opacity-90 text-sm
                  disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : (snippetToEdit ? '변경내용 저장' : '코드조각 추가')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default EditSnippetModal;
