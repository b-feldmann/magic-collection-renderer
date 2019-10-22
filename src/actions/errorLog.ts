import LogRocket from 'logrocket';

export enum ActionTag {
  Card = 'Card',
  Annotation = 'Annotation',
  Mechanic = 'Mechanic',
  User = 'User',
  Image = 'Image'
}

export enum RequestTag {
  Get = 'Get',
  Create = 'Post',
  Update = 'Put',
  Delete = 'Delete'
}

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
