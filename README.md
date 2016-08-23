





# VizTargetDiseases


Welcome! The purpose of this project is to provide an interactive and confiurable pieChart-web cpomonent making it available to navigate through complicated datasets.

Having a json object (or file) containg data with some minimal information:
1.name 
2.category-type 
3.value 

could be used to build an interactive pieChart visualization.

##Examples

###Live example
In this  [live example](http://partizanos.github.io/VizTargetDiseases/example/test1.html)
 we visualize relationships among different biological data (protein target, diseases and phenotypes)

###Demonstration Images


Initial layout
<img src="https://github.com/partizanos/VizTargetDiseases/blob/master/img/gsoc1.png" width="600">


On Click focus to a particulart data type, (the "home" breadCrumb on the top left can be used to navigate back using)
<img src="https://github.com/partizanos/VizTargetDiseases/blob/master/img/gsoc2.png" width="800">

On data point or label click inforamtive tooltip appears

<img src="https://github.com/partizanos/VizTargetDiseases/blob/master/img/gsoc3.png" width="800">

On "bull-ring" click expansion to focus on a particular range of data.
<img src="https://github.com/partizanos/VizTargetDiseases/blob/master/img/gsoc4.png" width="800">


## Basic Example Use:


Having included the file in dist folder and having the css in the build folder (by default vis.js is including it otherwise it has to be explicitely included), you can create can call the web component and pass your data 
(in the correct format) to be visualized.
```
<meta http-equiv="content-type" content="text/html; charset=UTF8">

<script src="./dist/pieChart.js"></script>

<div id="myAwesomeDiv"></div>

<script>

var v = vis()

//pass my div to the visualization library
v(document.getElementById("myAwesomeDiv"));

</script>

```       
    
Configuration can be added such as data to be visualized by passing either an array of json objects or a file directly 


## Configuration Options:

- set data input

on the creation of the vis object pass the read function along with the path to the file (d3.json is used to make the api call )or directly the json object

example:

```
var myData= [

            {
                "type": "diseases1",
                "value": 0.5,
                "subject": "EFO_0004591"
            },{
                "type": "diseases3",
                "value": 1,
                "subject": "EFO_0004591"
            }
        ]

var v = vis()
.read(myData)
//or
.read("/path/to/data.json")

```

- set Sizes div/text-font/data-points
```
    var v = vis()
      //set the div height+width in pixels, minimum is 250
     .size(500)//250-1000
      //set the font size in px 
      gsoc.setFontSize('10px')
```


- set colors of data-points/arcs
```
var v = vis()
         //pass an array of colors you would like to be included per data type instead of the default colors
         .setPieColors(["#ff0000"]) 
         //pass data point color you prefer instead of the default navy color
        .setPointColor('#fff')
        //orin rgb if you prefer
         .setPointColor('rgb(200,132,200)')
        
```




## Build component:

### Prerequisites:

| Program | Description | Website |
| --- | --- | --- |
| git | Git is a free and open source distributed version control system | https://git-scm.com/  |
| nodejs | Node.js® is a JavaScript runtime built on Chrome's V8 JavaScript engine | https://nodejs.org/ |
| npm | Node package manager| https://www.npmjs.com/ |
| gulp | JavaScript build system, node.js-based task runner | http://gulpjs.com/ |

### Build Instructions:

Having installed the software mentioned above run the following commands in the terminal or the command prompt:
</br>

1. ``` git clone https://github.com/partizanos/VizTargetDiseases.git ```
2. ```cd VizTargetDiseases```
3. ```npm install```
4. ```gulp build-browser```
5. (optional) to run the examples run a local webserver e.g. ```python -m http.server``` in the project folder and go to the examples url: ```localhost:8000/example ```





