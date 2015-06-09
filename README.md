Aarons
======
Aarons Portal

## Usage

### Create your project

Install the required tools: `gulp`, `bower`
```
npm install -g gulp bower
gem install sass
```

Install `npm` dependencies:
```
npm install
```

Install `bower` dependencies:
```
bower install
```

Note: to make bower works you will probably need to generate SSh keys and register on GitHub (https://help.github.com/articles/generating-ssh-keys/)

### Gulp tasks

* `gulp` or `gulp build` to build an optimized version of your application in `/dist`
* `gulp serve` to launch a browser sync server on your source files
* `gulp serve:dist` to launch a server on your optimized application
* `gulp wiredep` to fill bower dependencies in your `.html` file(s)
* `gulp test` to launch unit tests with Karma
* `gulp autotest` to launch unit tests with Karma in a watch mode
* `gulp e2e` to launch e2e tests with Protractor
* `gulp e2e:dist` to launch e2e tests with Protractor on the dist files

## Directory structure
Project structure and code organization are based on John Papa's AngularJS Style Guide https://github.com/johnpapa/angularjs-styleguide#application-structure-lift-principle.

<pre>
├──  src/
│   ├──  app/
│   │   ├──  feature1/
│   │   │   ├──  feature1.controller.js
│   │   │   └──  feature1.html
│   │   │   ├──  feature1.module.js
│   │   ├──  feature2/
│   │   │   ├──  feature2.controller.js
│   │   │   └──  feature2.html
│   │   │   ├──  feature2.module.js
│   │   └──  index.js
│   │   └──  index.scss
│   │   └──  vendor.scss
│   ├──  assets/
│   │   └──  images/
│   ├──  components/
│   │   └──  component1/
│   │   │   ├──  component1.controller.js
│   │   │   └──  component1.html
│   ├──  styles/
│   ├──  404.html
│   ├──  favico.ico
│   └──  index.html
├──  build/
├──  e2e/
├──  test/
</pre>

## CSS variables

#### Default color

`$brand-primary` - default theme color

#### Horizontal sheet

`$apc-sheet-header-bg` - background color of horizontal sheet header 
`$apc-sheet-header-color` - text color of horizontal sheet header
`$apc-sheet-bg` - background color of horizontal sheet content
`$apc-sheet-header-height`, `$apc-sheet-header-height-sm`, - height variants of sheet header

#### Sidebar
 
`$apc-sidebar-color` - sidebar menu text color
`$apc-sidebar-bg-color` - sidebar menu background color
`$apc-sidebar-item-border-color` - sidebar menu items border
`$apc-sidebar-item-hover-bg-color`, `$apc-sidebar-item-active-color`, 
`$apc-sidebar-active-bg-color` - sidebar menu items hover and active colors
`$apc-sidebar-width` - sidebar width
