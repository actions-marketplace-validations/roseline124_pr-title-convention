const conventionalCommitTypes = require('conventional-commit-types');
import is from '@sindresorhus/is';
import { sync as parser } from './parser';
import { formatMessage } from './formatMessage';
import { getPaserOptions } from './parser/parserOptions';

type ValidationOptions = {
  types?: string[];
  scopes?: string[];
  subjectPattern?: string;
  subjectPatternError?: string;
  action?: 'autofix' | 'comment';
};

export const validatePrTitle = async (prTitle: string, options?: ValidationOptions) => {
  const parserOpts = getPaserOptions();
  const result = parser(prTitle, parserOpts);

  validateType(prTitle, result.type, options?.types);
  validateScope(prTitle, result.scope, options?.scopes);
  validateSubject(prTitle, result.subject, options);
};

function validateType(prTitle: string, prType: string, types?: string[]) {
  const defaultTypes = Object.keys(conventionalCommitTypes.types);
  const availableTypes = types == null || types.length === 0 ? defaultTypes : types;

  if (!availableTypes.includes(prType)) {
    throw new Error(
      `Unknown release type "${prType}" found in pull request title "${prTitle}". \n\n${printAvailableTypes()}`
    );
  }

  function printAvailableTypes() {
    return `Available types:\n${availableTypes
      .map((type) => {
        let bullet = ` - ${type}`;
        if (availableTypes === defaultTypes) {
          bullet += `: ${conventionalCommitTypes.types[type].description}`;
        }
        return bullet;
      })
      .join('\n')}`;
  }
}

function validateScope(prTitle: string, scope?: string, scopes?: string[]) {
  const givenScopes = scope?.split(',')?.map((scope) => scope.trim());
  const unknownScopes = givenScopes ? givenScopes.filter((scope) => !scopes?.includes(scope)) : [];
  if (scopes && unknownScopes.length > 0) {
    throw new Error(
      `Unknown ${unknownScopes.length > 1 ? 'scopes' : 'scope'} "${unknownScopes.join(
        ','
      )}" found in pull request title "${prTitle}". Use one of the available scopes: ${scopes.join(
        ', '
      )}.`
    );
  }
}

function validateSubject(prTitle: string, subject?: string, options?: ValidationOptions) {
  if (is.nullOrUndefined(subject) || is.emptyString(subject) || subject === ' ') {
    throw new Error(`No subject found in pull request title "${prTitle}".`);
  }

  function throwSubjectPatternError(message: string) {
    if (options?.subjectPatternError) {
      message = formatMessage(options.subjectPatternError, {
        subject,
        title: prTitle,
      });
    }

    throw new Error(message);
  }

  if (options?.subjectPattern) {
    const match = subject.match(new RegExp(options.subjectPattern));

    if (!match) {
      throwSubjectPatternError(
        `The subject "${subject}" found in pull request title "${prTitle}" doesn't match the configured pattern "${
          options!.subjectPattern
        }".`
      );
    }

    const matchedPart = match?.[0];
    if (matchedPart!.length !== subject.length) {
      throwSubjectPatternError(
        `The subject "${subject}" found in pull request title "${prTitle}" isn't an exact match for the configured pattern "${
          options!.subjectPattern
        }". Please provide a subject that matches the whole pattern exactly.`
      );
    }
  }
}
