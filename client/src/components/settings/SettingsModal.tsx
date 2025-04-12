import React, { useRef, useState } from 'react';
import { AlertCircle, BookOpen, Clock, Download, Upload, Sun, Moon, Monitor } from 'lucide-react';
import Modal from '../common/modals/Modal';
import ChangelogModal from '../common/modals/ChangelogModal';
import { useToast } from '../../hooks/useToast';
import { Snippet } from '../../types/snippets';
import { Switch } from '../common/switch/Switch';
import { getAssetPath } from '../../utils/paths';

const GITHUB_URL = "https://github.com/jordan-dalby/AICodeStash";
const DOCKER_URL = "https://github.com/jordan-dalby/AICodeStash/pkgs/container/bytestash";
const REDDIT_URL = "https://www.reddit.com/r/selfhosted/comments/1gb1ail/selfhosted_code_snippet_manager/";
const WIKI_URL = "https://github.com/jordan-dalby/AICodeStash/wiki";

interface ImportProgress {
  total: number;
  current: number;
  succeeded: number;
  failed: number;
  errors: { title: string; error: string }[];
}

interface ImportData {
  version: string;
  exported_at: string;
  snippets: Omit<Snippet, 'id' | 'updated_at'>[];
}

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: {
    compactView: boolean;
    showCodePreview: boolean;
    previewLines: number;
    includeCodeInSearch: boolean;
    showCategories: boolean;
    expandCategories: boolean;
    showLineNumbers: boolean;
    theme: 'light' | 'dark' | 'system';
  };
  onSettingsChange: (newSettings: SettingsModalProps['settings']) => void;
  snippets: Snippet[];
  addSnippet: (snippet: Omit<Snippet, 'id' | 'updated_at'>, toast: boolean) => Promise<Snippet>;
  reloadSnippets: () => void;
  isPublicView: boolean;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  snippets,
  addSnippet,
  reloadSnippets,
  isPublicView
}) => {
  const [compactView, setCompactView] = useState(settings.compactView);
  const [showCodePreview, setShowCodePreview] = useState(settings.showCodePreview);
  const [previewLines, setPreviewLines] = useState(settings.previewLines);
  const [includeCodeInSearch, setIncludeCodeInSearch] = useState(settings.includeCodeInSearch);
  const [showCategories, setShowCategories] = useState(settings.showCategories);
  const [expandCategories, setExpandCategories] = useState(settings.expandCategories);
  const [showLineNumbers, setShowLineNumbers] = useState(settings.showLineNumbers);
  const [themePreference, setThemePreference] = useState(settings.theme);
  const [showChangelog, setShowChangelog] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  const handleSave = () => {
    onSettingsChange({
      compactView,
      showCodePreview,
      previewLines,
      includeCodeInSearch,
      showCategories,
      expandCategories,
      showLineNumbers,
      theme: themePreference
    });
    onClose();
  };

  const resetImportState = () => {
    setImporting(false);
    setImportProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateImportData = (data: any): data is ImportData => {
    if (!data || typeof data !== 'object') return false;
    if (typeof data.version !== 'string') return false;
    if (!Array.isArray(data.snippets)) return false;

    return data.snippets.every((snippet: Snippet) =>
      typeof snippet === 'object' &&
      typeof snippet.title === 'string' &&
      Array.isArray(snippet.fragments) &&
      Array.isArray(snippet.categories)
    );
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      const content = await file.text();
      const importData = JSON.parse(content);

      if (!validateImportData(importData)) {
        throw new Error('Invalid import file format');
      }

      const progress: ImportProgress = {
        total: importData.snippets.length,
        current: 0,
        succeeded: 0,
        failed: 0,
        errors: []
      };

      setImportProgress(progress);

      for (const snippet of importData.snippets) {
        try {
          await addSnippet(snippet, false);
          progress.succeeded += 1;
        } catch (error) {
          progress.failed += 1;
          progress.errors.push({
            title: snippet.title,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          console.error(`Failed to import snippet "${snippet.title}":`, error);
        }

        progress.current += 1;
        setImportProgress({ ...progress });
      }

      if (progress.failed === 0) {
        addToast(`Successfully imported ${progress.succeeded} snippets`, 'success');
        reloadSnippets();
      } else {
        addToast(
          `Imported ${progress.succeeded} snippets, ${progress.failed} failed. Check console for details.`,
          'warning'
        );
      }
    } catch (error) {
      console.error('Import error:', error);
      addToast(
        error instanceof Error ? error.message : 'Failed to import snippets',
        'error'
      );
    } finally {
      resetImportState();
    }
  };

  const handleExport = () => {
    try {
      const exportData = {
        version: '1.0',
        exported_at: new Date().toISOString(),
        snippets: snippets
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bytestash-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      addToast('Snippets exported successfully', 'success');
    } catch (error) {
      console.error('Export error:', error);
      addToast('Failed to export snippets', 'error');
    }
  };

  const SettingsGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="space-y-3 p-4 pt-0 gpl-0 bg-light-surface dark:bg-dark-surface rounded-lg">
      <h3 className="text-sm font-medium text-light-text dark:text-dark-text mb-3">{title}</h3>
      {children}
    </div>
  );

  const SettingRow: React.FC<{
    label: string;
    htmlFor: string;
    children: React.ReactNode;
    indent?: boolean;
    description?: string;
  }> = ({ label, htmlFor, children, indent, description }) => (
    <div className={`${indent ? 'ml-4' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <label htmlFor={htmlFor} className="text-light-text dark:text-dark-text text-sm">
            {label}
          </label>
          {description && (
            <p className="text-light-text-secondary dark:text-dark-text-secondary text-xs">
              {description}
            </p>
          )}
        </div>
        {children}
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={<h2 className="text-xl font-bold text-light-text dark:text-dark-text">Settings</h2>}
    >
      <div className="pb-4">
        <div className="space-y-4">
          <SettingsGroup title="설정">
            <div className="flex gap-2 justify-start">
              <button
                onClick={() => setThemePreference('light')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors text-sm
                  ${themePreference === 'light' 
                    ? 'bg-light-primary dark:bg-dark-primary text-white' 
                    : 'bg-light-hover dark:bg-dark-hover text-light-text dark:text-dark-text hover:bg-light-hover-more dark:hover:bg-dark-hover-more'
                  }`}
              >
                <Sun size={16} />
                라이트 모드
              </button>
              <button
                onClick={() => setThemePreference('dark')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors text-sm
                  ${themePreference === 'dark'
                    ? 'bg-light-primary dark:bg-dark-primary text-white'
                    : 'bg-light-hover dark:bg-dark-hover text-light-text dark:text-dark-text hover:bg-light-hover-more dark:hover:bg-dark-hover-more'
                  }`}
              >
                <Moon size={16} />
                다크 모드
              </button>
              <button
                onClick={() => setThemePreference('system')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors text-sm
                  ${themePreference === 'system'
                    ? 'bg-light-primary dark:bg-dark-primary text-white'
                    : 'bg-light-hover dark:bg-dark-hover text-light-text dark:text-dark-text hover:bg-light-hover-more dark:hover:bg-dark-hover-more'
                  }`}
              >
                <Monitor size={16} />
                시스템 모드
              </button>
            </div>
          </SettingsGroup>

          <SettingsGroup title="보기 설정">
            <SettingRow
              label="간단 뷰"
              htmlFor="compactView"
              description="간결한 코드 스니펫 표시"
            >
              <Switch
                id="compactView"
                checked={compactView}
                onChange={setCompactView}
              />
            </SettingRow>

            <div className="space-y-3">
              <SettingRow
                label="코드 프리뷰 보기"
                htmlFor="showCodePreview"
                description="코드조각 목록에 코드 미리보기 표시"
              >
                <Switch
                  id="showCodePreview"
                  checked={showCodePreview}
                  onChange={setShowCodePreview}
                />
              </SettingRow>

              {showCodePreview && (
                <SettingRow
                  label="미리보기 라인 수"
                  htmlFor="previewLines"
                  indent
                  description="미리보기에 표시할 최대 라인 수 (1-20)"
                >
                  <input
                    type="number"
                    id="previewLines"
                    value={previewLines}
                    onChange={(e) => setPreviewLines(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                    min="1"
                    max="20"
                    className="form-input w-20 rounded-md bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border text-light-text dark:text-dark-text p-1 text-sm"
                  />
                </SettingRow>
              )}
            </div>

            <SettingRow
              label="라인 번호 표시"
              htmlFor="showLineNumbers"
              description="코드 블록에 라인 번호 표시"
            >
              <Switch
                id="showLineNumbers"
                checked={showLineNumbers}
                onChange={setShowLineNumbers}
              />
            </SettingRow>
          </SettingsGroup>

          <SettingsGroup title="카테고리 설정">
            <SettingRow
              label="카테고리 보기"
              htmlFor="showCategories"
              description="코드조각에 대한 카테고리 레이블 표시"
            >
              <Switch
                id="showCategories"
                checked={showCategories}
                onChange={setShowCategories}
              />
            </SettingRow>

            {showCategories && (
              <SettingRow
                label="카테고리 확장"
                htmlFor="expandCategories"
                indent
                description="카테고리 그룹을 자동으로 확장합니다"
              >
                <Switch
                  id="expandCategories"
                  checked={expandCategories}
                  onChange={setExpandCategories}
                />
              </SettingRow>
            )}
          </SettingsGroup>

          <SettingsGroup title="검색 설정">
            <SettingRow
              label="검색에 코드 포함"
              htmlFor="includeCodeInSearch"
              description="제목뿐만 아니라 코드 내용 내에서도 검색"
            >
              <Switch
                id="includeCodeInSearch"
                checked={includeCodeInSearch}
                onChange={setIncludeCodeInSearch}
              />
            </SettingRow>
          </SettingsGroup>

          {!isPublicView && (
            <SettingsGroup title="데이터 관리">
              <div className="flex gap-2">
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 bg-light-hover dark:bg-dark-hover hover:bg-light-hover-more dark:hover:bg-dark-hover-more rounded-md transition-colors text-sm text-light-text dark:text-dark-text"
                >
                  <Download size={16} />
                  Export Snippets
                </button>
                <label
                  className={`flex items-center gap-2 px-4 py-2 bg-light-hover dark:bg-dark-hover hover:bg-light-hover-more dark:hover:bg-dark-hover-more rounded-md transition-colors text-sm cursor-pointer text-light-text dark:text-dark-text ${
                    importing ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportFile}
                    disabled={importing}
                    className="hidden"
                  />
                  <Upload size={16} />
                  Import Snippets
                </label>
              </div>

              {importProgress && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm text-light-text dark:text-dark-text">
                    <span>Importing snippets...</span>
                    <span>{importProgress.current} / {importProgress.total}</span>
                  </div>

                  <div className="w-full h-2 bg-light-surface dark:bg-dark-surface rounded-full overflow-hidden">
                    <div
                      className="h-full bg-light-primary dark:bg-dark-primary transition-all duration-200"
                      style={{
                        width: `${(importProgress.current / importProgress.total) * 100}%`
                      }}
                    />
                  </div>

                  {importProgress.errors.length > 0 && (
                    <div className="mt-2 text-sm">
                      <div className="flex items-center gap-1 text-red-400">
                        <AlertCircle size={14} />
                        <span>{importProgress.errors.length} errors occurred</span>
                      </div>
                      <div className="mt-1 max-h-24 overflow-y-auto">
                        {importProgress.errors.map((error, index) => (
                          <div key={index} className="text-red-400 text-xs">
                            Failed to import "{error.title}": {error.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </SettingsGroup>
          )}

          <div className="border-t border-light-border dark:border-dark-border pt-4 mt-4">
            <div className="flex gap-4 justify-center">
              {/*<button*/}
              {/*  onClick={() => setShowChangelog(true)}*/}
              {/*  className="opacity-60 hover:opacity-100 transition-opacity"*/}
              {/*  title="Changelog"*/}
              {/*>*/}
              {/*  <Clock className="w-6 h-6 text-light-text dark:text-dark-text" />*/}
              {/*</button>*/}
              {/*<a*/}
              {/*  href={GITHUB_URL}*/}
              {/*  target="_blank"*/}
              {/*  rel="noopener noreferrer"*/}
              {/*  className="opacity-60 hover:opacity-100 transition-opacity"*/}
              {/*  title="GitHub Repository"*/}
              {/*>*/}
              {/*  <img src={getAssetPath('/github-mark-white.svg')} alt="GitHub" className="w-6 h-6 dark:brightness-100 brightness-0" />*/}
              {/*</a>*/}
              {/*<a*/}
              {/*  href={DOCKER_URL}*/}
              {/*  target="_blank"*/}
              {/*  rel="noopener noreferrer"*/}
              {/*  className="opacity-60 hover:opacity-100 transition-opacity"*/}
              {/*  title="GitHub Packages"*/}
              {/*>*/}
              {/*  <img src={getAssetPath('/docker-mark-white.svg')} alt="Docker" className="w-6 h-6 dark:brightness-100 brightness-0" />*/}
              {/*</a>*/}
              {/*<a*/}
              {/*  href={REDDIT_URL}*/}
              {/*  target="_blank"*/}
              {/*  rel="noopener noreferrer"*/}
              {/*  className="opacity-60 hover:opacity-100 transition-opacity"*/}
              {/*  title="Reddit Post"*/}
              {/*>*/}
              {/*  <img src={getAssetPath('/reddit-mark-white.svg')} alt="Reddit" className="w-6 h-6 dark:brightness-100 brightness-0" />*/}
              {/*</a>*/}
              {/*<a*/}
              {/*  href={WIKI_URL}*/}
              {/*  target="_blank"*/}
              {/*  rel="noopener noreferrer"*/}
              {/*  className="opacity-60 hover:opacity-100 transition-opacity"*/}
              {/*  title="Documentation"*/}
              {/*>*/}
              {/*  <BookOpen className="w-6 h-6 text-light-text dark:text-dark-text" />*/}
              {/*</a>*/}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="mr-2 px-4 py-2 bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text rounded-md hover:bg-light-hover dark:hover:bg-dark-hover text-sm"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-light-primary dark:bg-dark-primary text-white rounded-md hover:opacity-90 text-sm"
          >
            저장
          </button>
        </div>
      </div>
      <ChangelogModal
        isOpen={showChangelog}
        onClose={() => setShowChangelog(false)}
      />
    </Modal>
  );
};

export default SettingsModal;
