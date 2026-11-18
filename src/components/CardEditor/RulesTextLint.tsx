import React, { useId, useRef } from 'react';
import { Button } from 'antd';
import BulbOutlined from '@ant-design/icons/BulbOutlined';
import WarningOutlined from '@ant-design/icons/WarningOutlined';
import { RulesTextLintIssue } from '../../utils/rulesTextLint';
import styles from './RulesTextLint.module.scss';

interface RulesTextLintProps {
  issues: RulesTextLintIssue[];
  onFix: (issue: RulesTextLintIssue) => void;
}

const SEVERITY_LABEL = { warning: 'Warning', suggestion: 'Suggestion' } as const;

/**
 * Templating hints for one rules text field, shown below it, with one-click fixes. All issues
 * belong to the same field.
 */
const RulesTextLint = ({ issues, onFix }: RulesTextLintProps): React.JSX.Element | null => {
  const idPrefix = useId();
  const summaryRef = useRef<HTMLElement>(null);

  if (!issues.length) return null;

  const warnings = issues.filter(issue => issue.severity === 'warning').length;

  const fix = (issue: RulesTextLintIssue) => {
    onFix(issue);
    // The fixed issue and its button disappear; keep focus in the panel.
    summaryRef.current?.focus();
  };

  return (
    <details
      className={styles.lint}
      open
      aria-label={`Templating hints for ${issues[0].fieldName}`}
    >
      <summary ref={summaryRef} className={styles.summary}>
        <span className={styles.title}>Templating hints</span>
        <span className={styles.count}>
          {issues.length}
          {warnings > 0 && (
            <span className={styles.visuallyHidden}>, {warnings} with warnings</span>
          )}
        </span>
      </summary>
      <ul className={styles.list}>
        {issues.map(issue => {
          const messageId = `${idPrefix}-${issue.key}`;
          return (
            <li key={issue.key} className={styles.issue} data-severity={issue.severity}>
              <span className={styles.icon} role="img" aria-label={SEVERITY_LABEL[issue.severity]}>
                {issue.severity === 'warning' ? <WarningOutlined /> : <BulbOutlined />}
              </span>
              <div className={styles.body}>
                <p id={messageId} className={styles.message}>
                  {issue.message}
                </p>
                <p className={styles.location}>
                  Line {issue.line + 1}: <q className={styles.excerpt}>{issue.text}</q>
                </p>
              </div>
              {issue.fix && (
                <Button
                  size="small"
                  className={styles.fixButton}
                  aria-describedby={messageId}
                  onClick={() => fix(issue)}
                >
                  {issue.fix.label}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </details>
  );
};

export default RulesTextLint;
