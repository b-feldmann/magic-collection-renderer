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

const captureError = (
  message = 'Something is wrong!',
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

export default captureError;
