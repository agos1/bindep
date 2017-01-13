
'use strict';
module.exports = function(grunt) {
// Internal lib.
var BLOCK=/^@bind:*(\S*)\s+(inline|linked)\s+(separated|aggregated)\s*(\s+(uglified|minified)\s*)?$/i;
var DEPBLOCK=/^\s*((#.*)?|(([a-zA-Z0-9_\-.]+)(\s*\(\s*(([a-zA-Z0-9_\-.]+)(\s*,\s*([a-zA-Z0-9_\-.]+))*)\s*\)\s*)?(\s*\[((=\~)|(!\~)|(==)|(!=)|(=\^)|(!\^)|(=\$)|(!\$)|(=\?)|(!\?))\s+"(.*)"\s*\])?(\s+nodeps)?(\s+nounique)?\s*))$/i;
var md5 = require('MD5');
var jsParser = require("uglify-js");
var cssParser = require('uglifycss');
grunt.registerMultiTask('resourcesbinder', 'embedding files', function() {
// Merge task-specific and/or target-specific options with these defaults.

var options =extend({
separator: grunt.util.linefeed,
development: false,
skipNoUpdates:false, 
shortLinks:true,
packageHandler:undefined,
localDependencies:{},
minifyHandlers:{
js:minifyJS,
css:minifyCSS
}, 
 
exclude:[],  
templates:[{target:'target/',sources:[]}],
attachments:{
js: {replacement:{link:'<script src="/js/{{file}}"></script>',inline:'<script>{{source}}</script>'},target:'js/'},
css:{replacement:{link:'<link rel="stylesheet" href="/css/{{file}}" />',inline:'<style><{{source}}<stype>'},target:'css/'}
},
resources:{}

},this.data);
var $ = {
bowerConfig: require('bower-config'),
 _: require('lodash'),
fs: require('fs'),
path: require('path'),
glob:require('glob')
};
var currentDir=process.cwd()+'/';
var cwd = options.cwd ? $.path.resolve(options.cwd)+'/' : currentDir;
for(var k=0;k<options.localDependencies.length;k++){
var l=options.localDependencies[k];
if (l.main==undefined) throw new Error('main entry is not defined in local item '+l.name);
if ($._.isString(l.main)) l.main=[l.main];
if (!l.main instanceof Array ) throw new Error('main entry contains a wrong data type in local item '+l.name+"["+typeof(l.main)+"]");

if (l.dependencies==undefined) l.dependencies={};
if (l.resources==undefined) l.resources={};
if (l.modules==undefined) l.modules={};
if (l.dependencies instanceof Array ) throw new Error('dependencies entry contains a wrong data type in local item '+k);
if (l.resources instanceof Array ) throw new Error('resources entry contains a wrong data type in local item '+k);
if (l.modules instanceof Array ) throw new Error('modules entry contains a wrong data type in local item '+k);

for(var key1 in l.dependencies){
	var dd=l.dependencies[key1];
if (dd == undefined) throw new Error('dependency entry is undefined in local item '+l.name+'.'+key1);
if (!((dd instanceof String)||typeof(dd)=='string') ) throw new Error('dependency entry contains a wrong data type in local item '+l.name+'.'+key1);
}
for(var key1 in l.modules){
	var dd=l.modules[key1];
if (dd == undefined) throw new Error('module entry is undefined in local item '+l.name+'.'+key1);
if (!((dd instanceof String)||typeof(dd)=='string') ) throw new Error('module entry contains a wrong data type in local item '+l.name+'.'+key1);
if (dd.main== undefined) throw new Error('module main entry is undefined in local item '+l.name+'.'+key1);
}
for(var key1 in l.resources){
	var dd=l.resources[key1];
if (dd == undefined) throw new Error('resource entry is undefined in local item '+l.name+'.'+key1);
if (!((dd instanceof String)||typeof(dd)=='string') ) throw new Error('resource entry contains a wrong data type in local item '+l.name+'.'+key1);
}


}


var helpers = require('./lib/helpers');
var config = module.exports.config = helpers.createStore();


config.set
('bower.json', options.bowerJson || JSON.parse($.fs.readFileSync($.path.join(cwd, './bower.json'))))
('bower-directory', options.directory || findBowerDirectory(cwd))
('cwd', cwd)
('package-handler',options.packageHandler)
('dev-dependencies', options.development||false)
('detectable-file-types', Object.keys(options.attachments))
('exclude', Array.isArray(options.exclude) ? options.exclude : [ options.exclude ])
('global-dependencies', helpers.createStore())
('resources',helpers.createStore())
('modules',helpers.createStore())
('local-dependencies',options.localDependencies)
('ignore-path', options.ignorePath)
('overrides', $._.extend({}, config.get('bower.json').overrides, options.overrides));
require('./lib/detect-dependencies')(config);

function searchStartTagBlock(text,pos){
var ch;
var size=text.length;

while(pos<size){
ch=text.charAt(pos);
if (ch==' ' || ch=='\t'){
	pos++; 
	continue;
} else {
if (text.indexOf('@bind',pos)==pos) return pos;
else return -1;
}
} 


return -1;
}

function processBlock(text,ld,callback){
var oldpos=0;
var pos=0;
var newtext='';
while (pos>=0) {
pos=text.indexOf('<!--',oldpos);
if (pos<0) break;

var pos1=searchStartTagBlock(text,pos+4);
if (pos1>0) { 
var pos2=text.indexOf('\n',pos1);
if (pos2==-1) throw new Error('Expect a newline after a bind block at position '+pos);
var buf=text.substring(pos1,pos2);
var match=BLOCK.exec(buf);
if (match==null) throw new Error('Wrong block syntax ('+buf+') at position '+pos);
pos1=text.indexOf('-->',pos2);
if (pos1==-1) throw new Error('Expect the end block at position '+pos);
var buffer; 
if (!options.development) buffer=callback(match[1],match[2],match[3],match[5],text.substring(pos2,pos1),pos2);
else buffer=callback(match[1],ld?'linked':'inline','separated',undefined,text.substring(pos2,pos1),pos2);

newtext+=text.substring(oldpos,pos)+buffer;
pos=pos1+3;
} else { 
pos+=4;
newtext+=text.substring(oldpos,pos);
}
oldpos=pos;

}
newtext+=text.substring(oldpos,text.length);
return newtext;
}

function extend(source,target) {
	    if (source == undefined) return target;
	    if (target instanceof Array  ) return target;
	    if (target instanceof Function  ) return target;
        if (target instanceof Object  ){
			var s=source;
			
			for (var prop in target) {
                s[prop] = extend( source[prop],target[prop]);
        }
        return s;
	} else return target;
    
}


function getSubConfig(){}

function findBowerDirectory(cwd) {
var directory = $.path.join(cwd, ($.bowerConfig.read(cwd).directory || 'bower_components'));
if (!$.fs.existsSync(directory)) {
var error = new Error('Cannot find where you keep your Bower packages.'+directory);
error.code = 'BOWER_COMPONENTS_MISSING';
throw error;
}
return directory;
}



function getContent(file){
if (!grunt.file.exists(file)) {
throw new Error('Source file "' + file + '" not found.');
}
return String($.fs.readFileSync(file));
}
function getCollapsedFile(filepath,index){
return removeExtension(getFileName(filepath))+'_'+index+".collapsed"
}

function renderLinkFile(depname,mimified,filetype){
return depname+"."+(mimified?'min.':'')+filetype;
} 

function getSourceReplacement(repl,source){
// the path of file is inside the replacement because front-end logic is unknow here
return repl.replace('{{source}}',source)+options.separator

}

function getLinkReplacement(repl,depname,mimified,filetype){
	// the path of file is inside the replacement because front-end logic is unknow here
return repl.replace('{{file}}',renderLinkFile(depname,mimified,filetype))+options.separator
}
 function getAbsolutePath(f){
if (f.indexOf($.path.sep)==0) return f;
return cwd+f;
}

function filterMains(mains,op,filter){
	
	
	
            if (op!=null){
				switch(op){
				case "==": 	
				return mains.filter(function(m){
				return m==filter;  
			   });
			    case "!=":
			    return mains.filter(function(m){
				return m!=filter;  
			   });
			    case "=~":	 return mains.filter(function(m){
				return regex.test(m);  
			    });
			    case "!~":	 return mains.filter(function(m){
				return !regex.test(m);  
			    });
			    case "=^":	 return mains.filter(function(m){
				return m.indexOf(filter)==0;  
			    });
			    case "!^":	 return mains.filter(function(m){
				return m.indexOf(filter)!=0;  
			    });
			     case "=$":	 return mains.filter(function(m){
				return m.lastIndexOf(filter)==m.length-filter.length;  
			    });
			    case "!$":	 return mains.filter(function(m){
				return m.lastIndexOf(filter)!==m.length-filter.length;  
			    });
			    case "=?":	 return mains.filter(function(m){
				return m.indexOf(filter)>=0;  
			    });
			    case "!?":	 return mains.filter(function(m){
				return m.indexOf(filter)<0;  
			    });
			    default:return mains;
				}
				
			   
			   
			   } else return mains;
}

function inject(replacetype,aggrtype,buffer,repl,bf,ismini,blocktype,commands,collapsedFiles,m,dest,minified,ext){
	
	    if (replacetype==='linked') {
			     if (aggrtype=='separated') {
					 buffer+=getLinkReplacement(repl,bf,ismini,blocktype);
					 commands.push({command:'cp',source:m,dest:dest+renderLinkFile(bf,ismini,blocktype),minified:minified});
			     } else {
					 collapsedFiles.push(m);
				 }
			    } else  if (replacetype==='inline') {
					  var tmp; 
					  if (aggrtype=='separated') {
						    tmp=getContent(m);
						    if (ismini) tmp=options.minifyHandlers[blocktype](tmp,minified!='minified');
						    buffer+=(ext!=blocktype)?getSourceReplacement(repl,tmp):tmp;
					  } else {
						  tmp=getContent(m);
						  buffer+=tmp;
					  }
				    
			        
			    }
	return buffer;		    	
}

function getSuffix(e){
	var pos=e.indexOf('/');
	if (pos) return e.substring(pos+1);
	return e;
}

function processDeps(subdeps,smains,norepeat,ftypedeps,adeps,gdeps,blocktype,found,buffer,replacetype,aggrtype,repl,ismini,commands,collapsedFiles,dest,minified,ext){
	var attachmentsInjected=0;
	for(var i=0;i<subdeps.length;i++){
					  var name=subdeps[i].name;
					  var depi=ftypedeps[name];
					  
					 if (depi==undefined) {
						if (adeps.get(name)==undefined){
						var error = new Error("Cannot find where you keep your Bower dependecy '"+name+"'");
						error.code = 'BOWER_DEPENDENCY_MISSING';
						throw error;
					} 
				  
					continue;
					}
					  if (gdeps[blocktype][name]==undefined) gdeps[blocktype][name]=[]; 
					   
					   
					   var mains=depi.main;
						
					   for(j=0;j<mains.length;j++){
					   var m=mains[j];  
					   if (gdeps[blocktype][name].indexOf(m)>=0) continue;
					   attachmentsInjected+=1;
					   var rind=smains.indexOf(m);
					   if (rind>=0) smains.splice(rind,1);
					   if (!norepeat) gdeps[blocktype][name].push(m);
					   if (!found) {
					   found=true;
					   grunt.log.writeln();
					   }  
					 
					   grunt.log.writeln('\t\t\t-Attachment  \''+m+"'");
				 
						var bf= removeExtension(getFileName(m));  
						if (!options.shortLinks) bf=name+"."+bf;  
				
						buffer=inject(replacetype,aggrtype,buffer,repl,bf,ismini,blocktype,commands,collapsedFiles,m,dest,minified,ext);
					
					   }
					 
					  
					}	
return {buffer:buffer,found:found,attachmentsInjected:attachmentsInjected}	
}
function  checkRequire(r,m){
if (typeof(r)=='string') return checkRequire([r],m);
else {
	
	for (var i=0;i<r.length;i++){
	if (m.indexOf(r[i])<0) return r[i];	
	}
return false;	
}
	
}
function parseText(filepath,replacements,commands,ld){
 var text = grunt.file.read(filepath);
 var ext=getFileType(filepath); 
 var gdeps={};
 var res={};
 var index=0;
 var adeps=config.get('global-dependencies');
 var newtext=processBlock(text,ld, function(blocktype,replacetype,aggrtype,minified,files,offset)
    {   
		blocktype=blocktype.toLowerCase();
		if (gdeps[blocktype]==undefined) gdeps[blocktype]={};
		grunt.log.writeln('\t-Detecting block type '+blocktype+' at offset '+offset+" ["+replacetype+","+aggrtype+((minified!=undefined)?", "+minified:'')+"]");
		if (config.get('detectable-file-types').indexOf(blocktype)==-1){
		throw new Error("file type '"+blocktype+"' present in a file '"+filepath+"' block  is not defined" );	
		}
		var atfiles=files.split(options.separator);
		var afiles=[],i,j;
		for(i=0;i<atfiles.length;i++) {
			var tmp=atfiles[i].trim();
			if (tmp!=='') {afiles.push(tmp);}
		}
       
        
		minified=(minified===undefined)?undefined:minified.trim();
		var ismini=minified!==undefined;
		var ftypedeps=config.get('global-dependencies-sorted')[blocktype]; 
	
		var buffer='';
		var isinline=(replacetype==='inline');
	    if (aggrtype==='aggregated' && replacetype==='linked'){
				var collapsedname=getCollapsedFile(filepath,index);
				var collapsedFiles=[];
	    }
	    var repl=replacements[blocktype].replacement[(isinline)?'inline':'link'];
		var dest=getAbsolutePath(replacements[blocktype].target);	
		

		for(var ii=0;ii<afiles.length;ii++) {
			
			var match=DEPBLOCK.exec(afiles[ii]);
			//console.log(match);
			if (match==null){
				throw new Error('Invalid syntax at offset '+offset+": '"+afiles[ii]+"'");
			
			}
            if (match[2]!=null) continue;
            var depname=match[4];
			var dep=ftypedeps[depname];
			var resources=dep.resources;
			var cwd=dep.cwd;
			var filter=match[22];
			var op=match[11];
			var nodependencies=match[23]!=null;
			var norepeat=match[24]!=null;
			var modules=[];
			var smains=[];
			if (match[5]){
			    var _modules=match[6].split(",");
			    _modules.forEach(function(e){ 
				    			
					modules.push(e); 
					
				});
			}
			grunt.log.write('\t\t-Injecting dependency \''+depname+(modules.length>0?("' ("+(modules.join())+")"):"")+((op==null)?':':(' filtered by '+op+' \''+filter+"':")));
			if (dep==undefined) {
				if (adeps.get(depname)==undefined){
				var error = new Error("Cannot find where you keep your Bower dependecy '"+depname+"'");
				error.code = 'BOWER_DEPENDENCY_MISSING';
				throw error;
			} 
	        grunt.log.writeln('no attachments');
			continue;
			}
            var r,rr;
			for (var k in resources){
				r=options.resources[k];
				rr=resources[k];
				
				if (r==undefined) throw new Error("resource type "+k+" not defined");
				rr.forEach(function(e){
					    res[cwd+'/'+e]=getAbsolutePath(r.target)+'/'+depname+'/'+getSuffix(e);
					  
				});
			}
			var modulesdeps={};
			modules.forEach(function(e){
			    var sm=dep.modules[e];
			    
					if (sm==undefined) throw new Error("module type "+e+" not defined");
					//console.log(JSON.stringify(sm));
					if (sm.require) {
						var notmatch=checkRequire(sm.require,modules);
						if (notmatch)  throw new Error("module type "+e+" requires the module "+notmatch);
					}
					var resources=sm.resources;
					sm.main.forEach(function(f1){
						var f=cwd+'/'+f1; 
						if (smains.indexOf(f)<0 &&$.path.extname(f)=='.'+blocktype) smains.push(f);
					});
					for (var k in resources){
						r=options.resources[k];
						rr=resources[k];
						if (r==undefined) throw new Error("resource type "+e+'.'+k+" not defined");
						rr.forEach(function(e1){
							     res[cwd+'/'+e1]=getAbsolutePath(r.target)+(r.global?'':('/'+depname))+'/'+getSuffix(e1);
						});
					}
				    for (var k in sm.dependencies){
					modulesdeps[k]=sm.dependencies[k];
				    }
            });
            
            
            
			
		    var attachmentsInjected=0;
            var found=false;
            
			if (gdeps[blocktype][depname]==undefined) gdeps[blocktype][depname]=[]; 
			var subdeps=dep.dependencies;
		
            
			if (!nodependencies){
					var res1=processDeps(subdeps,smains,norepeat,ftypedeps,adeps,gdeps,blocktype,found,buffer,replacetype,aggrtype,repl,ismini,commands,collapsedFiles,dest,minified,ext);
                    found=res1.found;
                    attachmentsInjected+=res1.attachmentsInjected;
                    buffer=res1.buffer;
                    var mdeps=[];
                   for(var k in modulesdeps) mdeps.push({name:k});
                   res1=processDeps(mdeps,smains,norepeat,ftypedeps,adeps,gdeps,blocktype,found,buffer,replacetype,aggrtype,repl,ismini,commands,collapsedFiles,dest,minified,ext);
                    found=res1.found;
                    attachmentsInjected+=res1.attachmentsInjected;
                    buffer=res1.buffer;
              
             }
			  var mains=filterMains(dep.main,op,filter);
			  for(i=0;i<mains.length;i++){
				  var m=mains[i]; 
				  var rind=smains.indexOf(m);
				  if (rind>=0) smains.splice(rind,1);
				  if (gdeps[blocktype][depname].indexOf(m)>=0) continue;
				  if (!norepeat) gdeps[blocktype][depname].push(m);
				  attachmentsInjected+=1;
				  if (!found) {
				   found=true;
				   grunt.log.writeln();
				   }   
				  grunt.log.writeln('\t\t\t-Attachment  \''+m+"'");  
					var bf= removeExtension(getFileName(m));  
					if (!options.shortLinks) bf=depname+"."+bf;   
				   
				  buffer=inject(replacetype,aggrtype,buffer,repl,bf,ismini,blocktype,commands,collapsedFiles,m,dest,minified,ext);
			  }


			  for(i=0;i<smains.length;i++){
				  var m=smains[i]; 
				  if (gdeps[blocktype][depname].indexOf(m)>=0) continue;
				  attachmentsInjected+=1;
				  if (!found) {
				   found=true;
				   grunt.log.writeln();
				   }   
				  grunt.log.writeln('\t\t\t-Attachment  \''+m+"'");  
					var bf= removeExtension(getFileName(m));  
					if (!options.shortLinks) bf=depname+"."+bf;   
				   
				  buffer=inject(replacetype,aggrtype,buffer,repl,bf,ismini,blocktype,commands,collapsedFiles,m,dest,minified,ext);
			  }


				if (attachmentsInjected==0){
				   grunt.log.writeln("no attachments found");
				}
			
		}
		
        if (aggrtype==='aggregated'){ 
		 if (replacetype==='linked'){ 
	     commands.push({command:'collapse',sources:collapsedFiles,dest:dest+renderLinkFile(collapsedname,ismini,blocktype),minified:minified});
		 buffer=getLinkReplacement(repl,collapsedname,ismini,blocktype);
		
		 index++;
        } else if (replacetype==='inline') { 
			 
		 if (ismini) buffer=options.minifyHandlers[blocktype](buffer,minified!='minified');
		
		 if (ext!=blocktype) buffer=getSourceReplacement(repl,buffer);
		}
	    } 
	    return buffer;
		
		
  
    }
);
if (Object.keys(res).length>0) {
	grunt.log.write('\t\t-Resources associated: ');
	for (var k in res){
		  grunt.log.write('\n\t\t\t-'+k);
		  commands.push({command:'cp',source:k	,dest:res[k],minified:false});	
	}
	grunt.log.write('\n');	
}
return newtext;	
}

function getFileType(filepath){
return $.path.extname(filepath).substr(1);
}

function purgeCommands(commands){
var map={};
return commands.filter(function(e){
var ch=md5(JSON.stringify(e));
if (map[ch]===undefined){
map[ch]=true;
return true;
} else return false;
});
}
var myMkdirSync = function(dir){
    if ($.fs.existsSync(dir)){
        return
    }

    try{
        $.fs.mkdirSync(dir)
    }catch(err){
        if(err.code == 'ENOENT'){
            myMkdirSync($.path.dirname(dir)) //create parent dir
            myMkdirSync(dir) //create dir
        }
    }
}

function save(s,t,binary){ 
	if (binary){
		s=getAbsolutePath(s);
		t=getAbsolutePath(t);
		if (!$.fs.existsSync(t)) { 
		   myMkdirSync($.path.dirname(t));

           $.fs.writeFileSync(t, $.fs.readFileSync(s));
	    
          return true;
		} else return false;
		
		
	} else { 
	    s=getAbsolutePath(s);
		try {
		
		var m=grunt.file.read(s);
		
		if ((md5(m))!=md5(t)) { 
		 myMkdirSync($.path.dirname(t));
		 grunt.file.write(s,t);
		return true;
		} 
		return false;
	   }catch(e){
		   grunt.file.write(s,t);
	   return true;
	   }
}
	
}

function minifyJS(f,mangled,ast){
	
var code=stripComments(f,mangled); 
var toplevel = jsParser.parse(code, { toplevel: ast  }); 
toplevel.figure_out_scope();
var compressor = jsParser.Compressor({unused:false,dead_code:false,warnings:false});
var compressed_ast = toplevel.transform(compressor);
if (mangled) {
var options={except:['$','require','exports']};
compressed_ast.figure_out_scope();
compressed_ast.compute_char_frequency(options);
compressed_ast.mangle_names(options);
}
code=compressed_ast.print_to_string();


return code;
}

function minifyCSS(f,mangled,ast){
	var orig_code=stripComments(f,mangled); 
return cssParser.processString(orig_code,
    { maxLineLen: 500, expandVars: true,uglyComments:mangled });
}

function stripComments(src,b) {
var m = [];

// Strip // ... leading banners.
m.push('(?:.*\\/\\/.*\\r?\\n)+\\s*');

if (b) {
// Strips all /* ... */ block comment banners.
m.push('\\/\\*[\\s\\S]*?\\*\\/');
} else {
// Strips only /* ... */ block comment banners, excluding /*! ... */.
m.push('\\/\\*[^!][\\s\\S]*?\\*\\/');
}
var re = new RegExp('^\\s*(?:' + m.join('|') + ')\\s*', '');
return src.replace(re, '');
}

function executeCommand(c){
	
switch(c.command){
case "cp"	: {
var source;
if (c.minified!==undefined &&c.minified) {
	
source=options.minifyHandlers[getFileType(c.source)](c.source,c.minified!=='minified');
if (save(c.dest, source)) grunt.log.writeln('\t-' + c.dest + ' saved');
else grunt.log.writeln('\t-' + c.dest + ' unchanged');
} else {
	if (save(c.source, c.dest,true)) grunt.log.writeln('\t-' + c.dest + ' saved');
	else grunt.log.writeln('\t-' + c.dest + ' unchanged');	
}
break;
}
case "collapse":{
source='';
var isugly=c.minified!=='minified';
if (c.minified!==undefined) {
c.sources.forEach(function(s){
source+=options.minifyHandlers[getFileType(s)](s,isugly);
});
} else {
c.sources.forEach(function(s){
source+=getContent(s);	
});
}
if (save(c.dest, source)) grunt.log.writeln('\t-' + c.dest + ' saved');
else grunt.log.writeln('\t-' + c.dest + ' unchanged');	
break;
}
}
}

function getFileName(filepath){
return $.path.basename(filepath);
}

function removeExtension(f){
return f.substring(0,f.lastIndexOf('.'));
}

function compareUpdateTime(f1,f2){
try {
var m1=$.fs.statSync(f1);
var m2=$.fs.statSync(f2);
return m1.mtime>m2.mtime;
}catch(e){
	
	return true;
}
}

function processFiles(files,target,commands,ld){
// Iterate over all src-dest file pairs.

for(var j=0;j<files.length;j++){
var res =files[j].match(/^[^**]*/);
var basename=res[0];
var mfiles=grunt.file.expandMapping(files[j], target, {
rename: function(destBase, destPath) {
return destBase + destPath.replace(basename,'');
}}); 



mfiles.forEach(function(filemap) {
var filepath=currentDir+filemap.src;
if (!grunt.file.exists(filepath)) {
grunt.log.warn('Source file "' + filepath + '" not found.');
return;
} 
if (grunt.file.isDir(filepath)) {
return;
}
// Read file source.


var replacements=options.attachments;
var dest=filemap.dest;

// Print a success message.
grunt.log.writeln('* Processing ' + filepath+":");
var content=(!options.skipNoUpdates || compareUpdateTime(filepath,dest))?parseText(filepath,replacements,commands,ld):null;

if (content!=null && save(dest, content)) 
grunt.log.writeln("\t -Saving to "+dest);
else grunt.log.writeln('\t -Saving is skipped:file '+dest+' is unchanged');

});


}

}



console.log("Development mode:"+options.development);
var commands=[];
var templates;
if (options.templates instanceof Array){

	for(var j=0;j<options.templates.length;j++){
		templates=options.templates[j];
		var ld=templates.linksOnDebug || true;
		processFiles(templates.sources,templates.target,commands,ld);
	}
} else {
	var ld=templates.linksOnDebug || true;
	processFiles(options.templates.sources,options.templates.target,commands,ld);
}
commands=purgeCommands(commands);
//grunt.log.writeln(JSON.stringify(commands));
if (commands.length>0)grunt.log.writeln('* Saving files ...');
commands.forEach(function(c){
executeCommand(c);
});

});
};
