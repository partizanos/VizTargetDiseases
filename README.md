





# VizTargetDiseases

Welcome the purpose of this project is to provide an interactive and confiurable pieChart-web cpomonent making available to navigate through complicated datasets.

Having a json object (or file) containg data with some minimal information:
name category-type and value could build an interactive pieChart such as this example:
http://partizanos.github.io/VizTargetDiseases/example/test1.html

The project was created during the GSOC 2016 and it is used to visualize relationships among biological data (protein target, diseases and phenotypes)

as in this [example](http://partizanos.github.io/VizTargetDiseases/example/test1.html)


## Basic Example Use:

Having included the file in dist folder, all you need to do it to include it!

Afterwards you can create can call the web component and pass your data (in the correct format) to be visualized.
```
<meta http-equiv="content-type" content="text/html; charset=UTF8">

<script src="pieChart.js"></script>

<div id="myAwesomeDiv"></div>

<script>
var example_data=[
            {
                "type": "diseases2",
                "value": 100,
                "subject": "asthma"
            },{
                "type": "diseases_2",
                "value": 200,
                "subject": "hepatitis"
            }
        ];

var v = vis()
       //if you have you data in a jjson file the realtive path to the fle could be added
       .read(arr)  
       //size of div 
       .size(500)
        // the red and green colors ro be included inthe pies and then the application chooses addtional colros
       .setPieColors(["red","#00ff00"])
       

</script>

```       
    
Configuration can be added such as data to be visualized by passing either an array of json objects or a file directly 


## Configuration Options:


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



<p <!--style="background-color=#ff6666"-->> Notice: In Windows environment it is required to set the programs mentioned as enviroment variables.</p>



