import React from 'react';

/**
 * Local replacement for antd's `Comment`, which was removed in antd v5.
 * Supports the subset of the original API used in this project.
 */
export interface CommentProps {
  author?: React.ReactNode;
  avatar?: React.ReactNode;
  content?: React.ReactNode;
  datetime?: React.ReactNode;
  actions?: React.ReactNode[];
  className?: string;
  children?: React.ReactNode;
}

const Comment: React.FC<CommentProps> = ({
  author,
  avatar,
  content,
  datetime,
  actions,
  className,
  children,
}) => (
  <div className={`mcr-comment${className ? ` ${className}` : ''}`}>
    <div className="mcr-comment-inner" style={{ display: 'flex' }}>
      {avatar && (
        <div className="mcr-comment-avatar" style={{ marginRight: 12 }}>
          {avatar}
        </div>
      )}
      <div className="mcr-comment-main" style={{ flex: 1 }}>
        {(author || datetime) && (
          <div className="mcr-comment-head" style={{ marginBottom: 4 }}>
            {author && (
              <span className="mcr-comment-author" style={{ marginRight: 8, fontWeight: 500 }}>
                {author}
              </span>
            )}
            {datetime && (
              <span
                className="mcr-comment-datetime"
                style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 12 }}
              >
                {datetime}
              </span>
            )}
          </div>
        )}
        <div className="mcr-comment-content">{content}</div>
        {actions && actions.length > 0 && (
          <ul
            className="mcr-comment-actions"
            style={{ listStyle: 'none', padding: 0, margin: '8px 0 0' }}
          >
            {actions.map((action, index) => (
              <li key={index} style={{ display: 'inline-block', marginRight: 12 }}>
                {action}
              </li>
            ))}
          </ul>
        )}
        {children}
      </div>
    </div>
  </div>
);

export default Comment;
