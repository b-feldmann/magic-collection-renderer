import LogRocket from 'logrocket';

export enum ActionTag {
  Card = 'Card',
  Annotation = 'Annotation',
  Mechanic = 'Mechanic',
  User = 'User'
}

export enum RequestTag {
  Get = 'Get',
  Create = 'Post',
  Update = 'Put',
  Delete = 'Delete'
}

export const captureRequest = (
  message: string,
  action: ActionTag,
  request: RequestTag,
  additional: { [key: string]: string | number | boolean }
) => {
  LogRocket.captureMessage(message, {
    tags: {
      // additional data to be grouped as "tags"
      action,
      request
    },
    extra: {
      ...additional
    }
  });
};

export const captureLog = (
  message: string,
  additional: { [key: string]: string | number | boolean }
) => {
  LogRocket.captureMessage(message, {
    tags: {
      // additional data to be grouped as "tags"
      action: 'Log'
    },
    extra: {
      ...additional
    }
  });
};

export const captureError = (
  message: Error,
  action: ActionTag,
  request: RequestTag,
  additional: { [key: string]: string | number | boolean }
) => {
  LogRocket.captureException(message, {
    tags: {
      // additional data to be grouped as "tags"
      action,
      request
    },
    extra: {
      ...additional
    }
  });
};
