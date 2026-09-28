import {
  MAX_ENV_INPUT_BYTES,
  type ScrubDiagnostic,
  type ScrubResult,
} from "../../contracts/env-scrubber";

function isKeyChar(ch: string): boolean {
  return (
    (ch >= "A" && ch <= "Z") ||
    (ch >= "a" && ch <= "z") ||
    (ch >= "0" && ch <= "9") ||
    ch === "_" ||
    ch === "." ||
    ch === "-"
  );
}

export function scrubEnv(input: string): ScrubResult {
  // UTF-8 encoded byte size validation
  const byteLength = new TextEncoder().encode(input).length;
  if (byteLength > MAX_ENV_INPUT_BYTES) {
    throw new Error(
      `Input exceeds maximum allowed size of 1 MiB (${byteLength} bytes)`
    );
  }

  let pos = 0;
  let currentLineNumber = 1;
  let redactedAssignments = 0;
  const diagnostics: ScrubDiagnostic[] = [];
  const chunks: string[] = [];

  // Check and preserve UTF-8 BOM if present
  if (input.charCodeAt(0) === 0xfeff) {
    chunks.push("\uFEFF");
    pos = 1;
  }

  while (pos < input.length) {
    const startOfStatement = pos;
    const statementLine = currentLineNumber;

    // Read leading horizontal whitespace
    while (pos < input.length && (input[pos] === " " || input[pos] === "\t")) {
      pos++;
    }

    // Check for EOF
    if (pos >= input.length) {
      chunks.push(input.slice(startOfStatement, pos));
      break;
    }

    // Check for blank line / newline
    if (input[pos] === "\r" || input[pos] === "\n") {
      if (
        input[pos] === "\r" &&
        pos + 1 < input.length &&
        input[pos + 1] === "\n"
      ) {
        pos += 2;
      } else {
        pos += 1;
      }
      currentLineNumber++;
      chunks.push(input.slice(startOfStatement, pos));
      continue;
    }

    // Check for comment line
    if (input[pos] === "#") {
      while (pos < input.length && input[pos] !== "\r" && input[pos] !== "\n") {
        pos++;
      }
      if (pos < input.length) {
        if (
          input[pos] === "\r" &&
          pos + 1 < input.length &&
          input[pos + 1] === "\n"
        ) {
          pos += 2;
        } else {
          pos += 1;
        }
        currentLineNumber++;
      }
      chunks.push(input.slice(startOfStatement, pos));
      continue;
    }

    // Helper to handle unrecognized statement line
    const handleUnrecognizedLine = () => {
      while (pos < input.length && input[pos] !== "\r" && input[pos] !== "\n") {
        pos++;
      }
      if (pos < input.length) {
        if (
          input[pos] === "\r" &&
          pos + 1 < input.length &&
          input[pos + 1] === "\n"
        ) {
          pos += 2;
        } else {
          pos += 1;
        }
        currentLineNumber++;
      }
      diagnostics.push({
        line: statementLine,
        kind: "unrecognized-line",
        message: `Unrecognized or invalid assignment syntax on line ${statementLine}`,
      });
      chunks.push(input.slice(startOfStatement, pos));
    };

    // Check for optional "export" prefix
    if (
      input.startsWith("export", pos) &&
      pos + 6 < input.length &&
      (input[pos + 6] === " " || input[pos + 6] === "\t")
    ) {
      pos += 6;
      while (pos < input.length && (input[pos] === " " || input[pos] === "\t")) {
        pos++;
      }
    }

    // Read Key
    const keyStart = pos;
    while (pos < input.length && isKeyChar(input[pos])) {
      pos++;
    }
    const key = input.slice(keyStart, pos);

    if (key.length === 0) {
      handleUnrecognizedLine();
      continue;
    }

    // Consume horizontal whitespace before separator
    while (pos < input.length && (input[pos] === " " || input[pos] === "\t")) {
      pos++;
    }

    // Detect separator: '=' or ': '
    let isValidSeparator = false;
    if (pos < input.length && input[pos] === "=") {
      isValidSeparator = true;
      pos++; // consume '='
      // consume spaces after '='
      while (pos < input.length && (input[pos] === " " || input[pos] === "\t")) {
        pos++;
      }
    } else if (
      pos < input.length &&
      input[pos] === ":" &&
      pos + 1 < input.length &&
      (input[pos + 1] === " " || input[pos + 1] === "\t")
    ) {
      isValidSeparator = true;
      pos++; // consume ':'
      // consume spaces after ':' (at least one)
      while (pos < input.length && (input[pos] === " " || input[pos] === "\t")) {
        pos++;
      }
    }

    if (!isValidSeparator) {
      handleUnrecognizedLine();
      continue;
    }

    // We have a valid key and separator!
    // The prefix includes indentation, export, key, separator, and post-separator spacing
    const prefix = input.slice(startOfStatement, pos);

    // Check if value is quoted
    const isQuoteChar =
      pos < input.length &&
      (input[pos] === '"' || input[pos] === "'" || input[pos] === "`");

    if (isQuoteChar) {
      const quoteChar = input[pos];
      const quoteStart = pos;
      pos++; // advance past opening quote

      let foundClose = false;
      while (pos < input.length) {
        if (input[pos] === quoteChar) {
          // Check if escaped by backslashes
          let backslashCount = 0;
          let k = pos - 1;
          while (k >= quoteStart && input[k] === "\\") {
            backslashCount++;
            k--;
          }
          if (backslashCount % 2 === 0) {
            foundClose = true;
            pos++; // consume closing quote
            break;
          }
        }

        // Track multiline line breaks inside quotes
        if (input[pos] === "\r" && pos + 1 < input.length && input[pos + 1] === "\n") {
          currentLineNumber++;
          pos += 2;
        } else if (input[pos] === "\r" || input[pos] === "\n") {
          currentLineNumber++;
          pos++;
        } else {
          pos++;
        }
      }

      if (!foundClose) {
        // Unterminated quote! Leave source unchanged from startOfStatement and report diagnostic
        diagnostics.push({
          line: statementLine,
          kind: "unterminated-quote",
          message: `Unterminated quote starting on line ${statementLine}`,
        });
        chunks.push(input.slice(startOfStatement, pos));
        continue;
      }

      // Read remainder of the line (trailing spacing, inline comments, newline)
      const restStart = pos;
      while (pos < input.length && input[pos] !== "\r" && input[pos] !== "\n") {
        pos++;
      }
      if (pos < input.length) {
        if (
          input[pos] === "\r" &&
          pos + 1 < input.length &&
          input[pos + 1] === "\n"
        ) {
          pos += 2;
        } else {
          pos += 1;
        }
        currentLineNumber++;
      }
      const restOfLine = input.slice(restStart, pos);

      chunks.push(prefix + quoteChar + quoteChar + restOfLine);
      redactedAssignments++;
    } else {
      // Unquoted value: ends at unquoted '#' or physical line ending
      const valStart = pos;
      while (
        pos < input.length &&
        input[pos] !== "#" &&
        input[pos] !== "\r" &&
        input[pos] !== "\n"
      ) {
        pos++;
      }

      if (pos < input.length && input[pos] === "#") {
        // There is an inline comment! Preserve spacing before '#'
        let valEnd = pos;
        while (
          valEnd > valStart &&
          (input[valEnd - 1] === " " || input[valEnd - 1] === "\t")
        ) {
          valEnd--;
        }
        const commentAndSpacingStart = valEnd;

        while (pos < input.length && input[pos] !== "\r" && input[pos] !== "\n") {
          pos++;
        }
        if (pos < input.length) {
          if (
            input[pos] === "\r" &&
            pos + 1 < input.length &&
            input[pos + 1] === "\n"
          ) {
            pos += 2;
          } else {
            pos += 1;
          }
          currentLineNumber++;
        }
        chunks.push(prefix + input.slice(commentAndSpacingStart, pos));
      } else {
        // No comment, just line ending
        const lineEndingStart = pos;
        if (pos < input.length) {
          if (
            input[pos] === "\r" &&
            pos + 1 < input.length &&
            input[pos + 1] === "\n"
          ) {
            pos += 2;
          } else {
            pos += 1;
          }
          currentLineNumber++;
        }
        chunks.push(prefix + input.slice(lineEndingStart, pos));
      }
      redactedAssignments++;
    }
  }

  return {
    output: chunks.join(""),
    redactedAssignments,
    diagnostics,
  };
}
