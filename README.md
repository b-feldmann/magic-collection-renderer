Magic Card Collection Renderer / Editor

This is a hobby project so that I can design my own Magic Set with my friends. I have no connection to "Wizards of the Coast". This project can be used by everyone.

## Features:

##### Key Features
- Create and Update Magic Cards
- Simple User Management (without passwords - we are friends and trust each other)
- Add comment to cards
- Rate Cards
- Render cards in different art styles (Standard, Borderless, Invocation)
- Support double faced cards
- Write a Mechanic only one time (like Convoke/Adamant) and refer to the mechanic on multiple cards.
- Search the collection by card name
- Filter the collection by card type, color or rarity
- download the complete collection as json

##### Next Steps
- Add card change history
- Add card watch list

## Personal Requirements
I like to use hobby projects to test new technologies. I test the following technologies in this project. 

- TypeScript:
  - First Big TypeScript Project 
  - Use Typescript everywhere
- React Hooks
  - Only use Functional Components
  - Extensive use of hooks
- Vanilla React
  - Don't use state container like react-redux (I know this already)
  - Only use the useContext and useReducer Hooks for state management

## Screenshots
..

## Prerequisites
You need to setup a server for the tool. Either write your own or use my implementation that uses a mongodb.

## Available Scripts

In the project directory, you can run:

### `yarn start`

Runs the app in the development mode.<br>
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br>
You will also see any lint errors in the console.

### `yarn dev`

Runs the app in the development mode.<br>
Open [http://localhost:5000](http://localhost:5000) to view it in the browser.

It start an electron app that uses the server as well.

### `yarn build`

Builds the app for production to the `build` folder.<br>
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## License
MIT

## Image Resources
I use card templates and fonts creates by Cajun 

## Disclaimer
This repo has no affiliation or relationship with Wizards of the Coast.
