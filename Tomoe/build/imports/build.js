import fs from 'fs-extra';
import { Definitions } from '../core/setup.requirements.js'
const build = require('../' +  Definitions.configName).build;

if(build){
  for(i in build){
    const config = build[i];

    const dist = config.dist_folder + '/';
    const imports = config.imports;

    if(!fs.existsSync(dist)){
      fs.mkdirSync(dist);
    }

    for(i in imports){
      const origin = imports[i][0];

      if(fs.existsSync(origin)){
        const saveURL = dist + imports[i][1];
        fs.copySync(origin, saveURL);
      } else {
        throw `The following import, ${i}, does not exist at '${origin}'`;
      }
    }
  }
}
