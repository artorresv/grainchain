'use strict';

const fs = require('fs'),
      multer = require('multer'),
      events = require('events'),
      express = require('express'),
      readline = require('readline'),
      upload = multer({storage: multer.diskStorage({destination: './public/uploaded'})});

const router = express.Router();
let test_array = [];

function searchNeighborhoods(cells) {

  const dimensions = {
    height: cells.length,
    width: (cells[0].length)
  };

  let cores = []

  for (let row = 0; row < dimensions.height; row++){
    for (let col = 0; col < dimensions.width; col++){
      if (cells[row][col] == 0) {

        let origin = {row: row, column: col};

        cores.push(
          {id: {row: row, col: col},
          scope: scope(origin, cells, dimensions)}
        );
      }
    }
  }

  return cores;
}

function scope(origin, cells, dimensions) {
  let neighbor_row = 0;
  let neighbor_col = 0;

  const {row: row, column: col} = origin;
  
  let neighbor_cell;
  let current_cell;

  // First item in a cell's scope is the origin cell itself
  let scope = [{row: origin.row, col: origin.column}];

  const neighbor = [
    [row,   col+1], // rigth
    [row+1, col],   // bottom
    [row,   col-1], // left
    [row-1, col]    // top
  ];

  for (let i = 0; i < neighbor.length; i++) {
    neighbor_row = neighbor[i][0];
    neighbor_col = neighbor[i][1];

    if ((neighbor_row >= 0 && neighbor_col >= 0) && 
        (neighbor_row < dimensions.height && neighbor_col < dimensions.width)){
      neighbor_cell = cells[neighbor_row][neighbor_col];

      if (neighbor_cell === 1)
        continue;

      scope.push({row: neighbor_row, col: neighbor_col});

      current_cell = 0;

      while (
        (neighbor_row >= 0 && neighbor_col >= 0) && 
        (neighbor_row < dimensions.height-1 && neighbor_col < dimensions.width-1) && 
        (current_cell != 1)){

        switch (i) {
          case 0:
            neighbor_col++;
            break;
          case 1:
            neighbor_row++;
            break;
          case 2:
            neighbor_col--;
            break;
          case 3:
            neighbor_row--;
            break;
        }

        if ((neighbor_row === -1 || neighbor_col === -1))
          continue;

        current_cell = cells[neighbor_row][neighbor_col];

        if (current_cell != 1)
          scope.push({row: neighbor_row, col: neighbor_col});
      }
    } 
  }

  return scope;
}

function solve() {
  let temporary_array = JSON.parse(JSON.stringify(test_array));
  let solution_array = JSON.parse(JSON.stringify(test_array));

  let best_matches = [];
  let best_match = {};

  // initially all cells with 0 are core candidates
  let matches = temporary_array.reduce((acc,cur) => acc + cur.filter(x => x == 0).length, 0);
  let cores = [];

  // an empty core list means there are no cells left in the temporary array
  while (matches > 0) {
    // compute cell's scope for the whole array
    cores = searchNeighborhoods(temporary_array);

    if (cores.length === 0)
      break;
    
    // ascending sort cores by scope length
    cores.sort((a,b) => b.scope.length - a.scope.length);
    
    // first core is the best candidate per each iteration
    best_match = cores.shift();
    
    best_matches.push(best_match);
    
    // mark matching cells as 1 in the temporary_array
    best_match.scope.forEach(match => {
      temporary_array[match.row][match.col] = 1;
    });

    matches = cores.length;
  }

  best_matches.forEach(match => {
    // pick a random background color for each core cell scope
    const bgcolor = getColorCode();
    
    // set in-scope cells
    match.scope.forEach(scope_cell => {
      solution_array[scope_cell.row][scope_cell.col] = {
        value: test_array[scope_cell.row][scope_cell.col],
        icon: '&nbsp;&nbsp;&nbsp;&nbsp;',
        style: `background-color: ${bgcolor}`
      };
    });

    // set core cells
    solution_array[match.id.row][match.id.col] = {
      value: test_array[match.id.row][match.id.col],
      icon: '&#x1F4A1;',
      style: `background-color: ${bgcolor}`
    };
    
  });

  // set blocking cells
  test_array.forEach((row, row_index) => {
    row.forEach((col, col_index) => {
      const cell_value = test_array[row_index][col_index];

      if (cell_value == 1){
        solution_array[row_index][col_index] = {
          value: cell_value,
          style: 'background-color: black;'
        };  
      }
    });
  });

  return {solution: solution_array, matches: best_matches.length};
}

function getColorCode() {
  const r = Math.random() * (255 - 0) + 0;
  const g = Math.random() * (255 - 0) + 0;
  const b = Math.random() * (255 - 0) + 0;

  return `rgb(${parseInt(r)}, ${parseInt(g)}, ${parseInt(b)})`;
}

router.post('/', upload.single('uploaded_file'), async (req, res) => {

    if (!req.file) {
      return res.redirect('http://localhost:3000');
    }
    
    const uploaded_file = readline.createInterface({
      input: fs.createReadStream(req.file.path),
      crlfDelay: Infinity
    });

    test_array = [];

    uploaded_file.on('line', (line) => {
      test_array.push(line.split(',').map(i => parseInt(i)));
    });

    await events.once(uploaded_file, 'close');

    fs.unlink(req.file.path, (err) => {
      if (err) throw err
    });

    const {solution, matches} = solve();

    res.status(201).render(
      'results',
      {list: solution, matches: matches, rows: test_array.length, cols: test_array[0].length}
    );
});

module.exports = router;
