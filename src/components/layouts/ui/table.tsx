import React, { useState } from "react";
import classNames from "classnames";

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export const Table: React.FC<TableProps> = ({ children, className }) => {
  return (
    <div className="overflow-x-auto">
      <table className={classNames("min-w-full border-collapse border border-zinc-300", className)}>
        {children}
      </table>
    </div>
  );
};

interface TableSectionProps {
  children: React.ReactNode;
  className?: string;
}

export const TableHeader: React.FC<TableSectionProps> = ({ children, className }) => {
  return (
    <thead
      className={classNames(
        "h-10 bg-gray-100 sticky top-0 z-10 border-b border-zinc-300",
        className
      )}
    >
      {children}
    </thead>
  );
};

export const TableBody: React.FC<TableSectionProps> = ({ children, className }) => {
  return <tbody className={classNames("h-10 divide-y divide-zinc-300", className)}>{children}</tbody>;
};

export const TableFooter: React.FC<TableSectionProps> = ({ children, className }) => {
  return <tfoot className={classNames("bg-gray-100", className)}>{children}</tfoot>;
};

interface TableRowProps {
  children: React.ReactNode;
  className?: string;
  expandableContent?: React.ReactNode;
}

export const TableRow: React.FC<TableRowProps> = ({ children, className, expandableContent }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <tr
        className={classNames("hover:bg-gray-50 cursor-pointer border-b border-zinc-300", className)}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {children}
      </tr>
      {isExpanded && expandableContent && (
        <tr className="bg-gray-100 border-b border-zinc-300">
          <td colSpan={100} className="px-2 py-1.5">
            {expandableContent}
          </td>
        </tr>
      )}
    </>
  );
};

interface TableCellProps {
  children: React.ReactNode;
  className?: string;
  isHeader?: boolean;
  onClick?: () => void;
  sortable?: boolean;
  sortDirection?: "asc" | "desc";
}

export const TableCell: React.FC<TableCellProps> = ({
  children,
  className,
  isHeader,
  onClick,
  sortable,
  sortDirection,
}) => {
  const Component = isHeader ? "th" : "td";
  return (
    <Component
      className={classNames(
        "px-2 py-1.5 text-left border border-zinc-300",
        isHeader ? "font-medium text-gray-700" : "text-gray-900",
        sortable && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
      {sortable && (
        <span className="ml-2">
          {sortDirection === "asc" ? "▲" : sortDirection === "desc" ? "▼" : ""}
        </span>
      )}
    </Component>
  );
};
