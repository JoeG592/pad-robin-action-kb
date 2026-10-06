window.CAPTURES = {
 "00-hook-kb": {
  "flow": "00-hook-kb",
  "status": "PASS",
  "errors": [],
  "actions": 9,
  "window": {
   "h": 1038,
   "w": 1938
  },
  "canvas": {
   "y": 163,
   "w": 1526,
   "h": 808,
   "x": 342
  },
  "stripHeight": 693,
  "rows": [
   {
    "i": 0,
    "name": "Get files in folder",
    "y": 0,
    "h": 79
   },
   {
    "i": 1,
    "name": "For each CurrentItem in Files",
    "y": 79,
    "h": 60
   },
   {
    "i": 2,
    "name": "Launch Excel",
    "y": 139,
    "h": 78
   },
   {
    "i": 3,
    "name": "Get first free column/row from Excel worksheet",
    "y": 217,
    "h": 103
   },
   {
    "i": 4,
    "name": "Get current date and time",
    "y": 320,
    "h": 78
   },
   {
    "i": 5,
    "name": "Write to Excel worksheet",
    "y": 398,
    "h": 79
   },
   {
    "i": 6,
    "name": "Close Excel",
    "y": 477,
    "h": 78
   },
   {
    "i": 7,
    "name": "End",
    "y": 555,
    "h": 60
   },
   {
    "i": 8,
    "name": "Display message",
    "y": 615,
    "h": 78
   }
  ],
  "badge": {
   "y": 104,
   "w": 44,
   "h": 44,
   "color": "#F3F2F1",
   "x": 1880
  }
 },
 "00-hook-memory": {
  "flow": "00-hook-memory",
  "status": "FAIL",
  "errors": [
   "Unknown argument(s): 'Filter'.",
   "Parameter 'Value to iterate': Variable 'Files' doesn't exist.",
   "Module 'Excel' or action 'LaunchExcel' wasn't found."
  ],
  "actions": 9,
  "window": {
   "h": 1038,
   "w": 1938
  },
  "canvas": {
   "y": 163,
   "w": 1526,
   "h": 583,
   "x": 342
  },
  "stripHeight": 668,
  "rows": [
   {
    "i": 0,
    "name": "Get files in folder, Has error",
    "y": 0,
    "h": 79
   },
   {
    "i": 1,
    "name": "For each CurrentItem in Files, Has error",
    "y": 79,
    "h": 60
   },
   {
    "i": 2,
    "name": "Unknown action, Has error",
    "y": 139,
    "h": 78
   },
   {
    "i": 3,
    "name": "Unknown action, Has error",
    "y": 217,
    "h": 78
   },
   {
    "i": 4,
    "name": "Unknown action, Has error",
    "y": 295,
    "h": 78
   },
   {
    "i": 5,
    "name": "Unknown action, Has error",
    "y": 373,
    "h": 79
   },
   {
    "i": 6,
    "name": "Unknown action, Has error",
    "y": 452,
    "h": 78
   },
   {
    "i": 7,
    "name": "End",
    "y": 530,
    "h": 60
   },
   {
    "i": 8,
    "name": "Unknown action, Has error",
    "y": 590,
    "h": 78
   }
  ],
  "badge": {
   "y": 104,
   "w": 44,
   "h": 44,
   "color": "#F3F2F1",
   "x": 1880
  }
 },
 "01-backup-downloads": {
  "flow": "01-backup-downloads",
  "status": "PASS",
  "errors": [],
  "actions": 4,
  "window": {
   "h": 1038,
   "w": 1938
  },
  "canvas": {
   "y": 163,
   "w": 1526,
   "h": 808,
   "x": 342
  },
  "stripHeight": 338,
  "rows": [
   {
    "i": 0,
    "name": "Get current date and time",
    "y": 0,
    "h": 79
   },
   {
    "i": 1,
    "name": "Get files in folder",
    "y": 79,
    "h": 78
   },
   {
    "i": 2,
    "name": "Copy file(s)",
    "y": 157,
    "h": 78
   },
   {
    "i": 3,
    "name": "Display message",
    "y": 235,
    "h": 103
   }
  ],
  "badge": {
   "y": 104,
   "w": 44,
   "h": 44,
   "color": "#F3F2F1",
   "x": 1880
  }
 },
 "02-outlook-attachments": {
  "flow": "02-outlook-attachments",
  "status": "PASS",
  "errors": [],
  "actions": 16,
  "window": {
   "h": 1038,
   "w": 1938
  },
  "canvas": {
   "y": 163,
   "w": 1526,
   "h": 808,
   "x": 342
  },
  "stripHeight": 1204,
  "rows": [
   {
    "i": 0,
    "name": "Launch Outlook",
    "y": 0,
    "h": 79
   },
   {
    "i": 1,
    "name": "Get current date and time",
    "y": 79,
    "h": 78
   },
   {
    "i": 2,
    "name": "Convert datetime to text",
    "y": 157,
    "h": 78
   },
   {
    "i": 3,
    "name": "Set variable",
    "y": 235,
    "h": 78
   },
   {
    "i": 4,
    "name": "If folder exists",
    "y": 313,
    "h": 79
   },
   {
    "i": 5,
    "name": "Create folder",
    "y": 392,
    "h": 78
   },
   {
    "i": 6,
    "name": "End",
    "y": 470,
    "h": 60
   },
   {
    "i": 7,
    "name": "Retrieve email messages from Outlook",
    "y": 530,
    "h": 78
   },
   {
    "i": 8,
    "name": "Set variable",
    "y": 608,
    "h": 78
   },
   {
    "i": 9,
    "name": "If EmailCount =0 then",
    "y": 686,
    "h": 60
   },
   {
    "i": 10,
    "name": "Display message",
    "y": 746,
    "h": 78
   },
   {
    "i": 11,
    "name": "Else",
    "y": 824,
    "h": 60
   },
   {
    "i": 12,
    "name": "Get files in folder",
    "y": 884,
    "h": 78
   },
   {
    "i": 13,
    "name": "Display message",
    "y": 962,
    "h": 104
   },
   {
    "i": 14,
    "name": "End",
    "y": 1066,
    "h": 60
   },
   {
    "i": 15,
    "name": "Close Outlook",
    "y": 1126,
    "h": 78
   }
  ],
  "badge": {
   "y": 104,
   "w": 44,
   "h": 44,
   "color": "#F3F2F1",
   "x": 1880
  }
 },
 "03-monthly-invoice-report": {
  "flow": "03-monthly-invoice-report",
  "status": "PASS",
  "errors": [],
  "actions": 29,
  "window": {
   "h": 1038,
   "w": 1938
  },
  "canvas": {
   "y": 163,
   "w": 1526,
   "h": 808,
   "x": 342
  },
  "stripHeight": 2235,
  "rows": [
   {
    "i": 0,
    "name": "Get current date and time",
    "y": 0,
    "h": 79
   },
   {
    "i": 1,
    "name": "Convert datetime to text",
    "y": 79,
    "h": 78
   },
   {
    "i": 2,
    "name": "If folder exists",
    "y": 157,
    "h": 78
   },
   {
    "i": 3,
    "name": "Create folder",
    "y": 235,
    "h": 78
   },
   {
    "i": 4,
    "name": "End",
    "y": 313,
    "h": 60
   },
   {
    "i": 5,
    "name": "Get files in folder",
    "y": 373,
    "h": 79
   },
   {
    "i": 6,
    "name": "Create new list",
    "y": 452,
    "h": 78
   },
   {
    "i": 7,
    "name": "Set variable",
    "y": 530,
    "h": 78
   },
   {
    "i": 8,
    "name": "Launch Excel",
    "y": 608,
    "h": 78
   },
   {
    "i": 9,
    "name": "Write to Excel worksheet",
    "y": 686,
    "h": 79
   },
   {
    "i": 10,
    "name": "Write to Excel worksheet",
    "y": 765,
    "h": 79
   },
   {
    "i": 11,
    "name": "For each CurrentItem in Files",
    "y": 844,
    "h": 60
   },
   {
    "i": 12,
    "name": "Read from CSV file",
    "y": 904,
    "h": 78
   },
   {
    "i": 13,
    "name": "Get file path part",
    "y": 982,
    "h": 103
   },
   {
    "i": 14,
    "name": "Get first free column/row from Excel worksheet",
    "y": 1085,
    "h": 103
   },
   {
    "i": 15,
    "name": "Write to Excel worksheet",
    "y": 1188,
    "h": 79
   },
   {
    "i": 16,
    "name": "Set variable",
    "y": 1267,
    "h": 78
   },
   {
    "i": 17,
    "name": "Write to Excel worksheet",
    "y": 1345,
    "h": 78
   },
   {
    "i": 18,
    "name": "If LineItems =0 then",
    "y": 1423,
    "h": 60
   },
   {
    "i": 19,
    "name": "Log message",
    "y": 1483,
    "h": 78
   },
   {
    "i": 20,
    "name": "Else",
    "y": 1561,
    "h": 60
   },
   {
    "i": 21,
    "name": "Add item to list",
    "y": 1621,
    "h": 78
   },
   {
    "i": 22,
    "name": "Increase variable",
    "y": 1699,
    "h": 78
   },
   {
    "i": 23,
    "name": "End",
    "y": 1777,
    "h": 60
   },
   {
    "i": 24,
    "name": "End",
    "y": 1837,
    "h": 60
   },
   {
    "i": 25,
    "name": "Join text",
    "y": 1897,
    "h": 78
   },
   {
    "i": 26,
    "name": "Close Excel",
    "y": 1975,
    "h": 79
   },
   {
    "i": 27,
    "name": "Zip files",
    "y": 2054,
    "h": 78
   },
   {
    "i": 28,
    "name": "Display message",
    "y": 2132,
    "h": 103
   }
  ],
  "badge": {
   "y": 104,
   "w": 44,
   "h": 44,
   "color": "#F3F2F1",
   "x": 1880
  }
 },
 "04-sales-api-report": {
  "flow": "04-sales-api-report",
  "status": "PASS",
  "errors": [],
  "actions": 61,
  "window": {
   "h": 1038,
   "w": 1938
  },
  "canvas": {
   "y": 163,
   "w": 1526,
   "h": 808,
   "x": 342
  },
  "stripHeight": 4651,
  "rows": [
   {
    "i": 0,
    "name": "Get current date and time",
    "y": 0,
    "h": 79
   },
   {
    "i": 1,
    "name": "Convert datetime to text",
    "y": 79,
    "h": 78
   },
   {
    "i": 2,
    "name": "Set variable",
    "y": 157,
    "h": 78
   },
   {
    "i": 3,
    "name": "If folder exists",
    "y": 235,
    "h": 78
   },
   {
    "i": 4,
    "name": "Create folder",
    "y": 313,
    "h": 79
   },
   {
    "i": 5,
    "name": "End",
    "y": 392,
    "h": 60
   },
   {
    "i": 6,
    "name": "Set variable",
    "y": 452,
    "h": 78
   },
   {
    "i": 7,
    "name": "Set variable",
    "y": 530,
    "h": 78
   },
   {
    "i": 8,
    "name": "Set variable",
    "y": 608,
    "h": 78
   },
   {
    "i": 9,
    "name": "Create new list",
    "y": 686,
    "h": 79
   },
   {
    "i": 10,
    "name": "Create new list",
    "y": 765,
    "h": 79
   },
   {
    "i": 11,
    "name": "Log message",
    "y": 844,
    "h": 78
   },
   {
    "i": 12,
    "name": "On block error FetchOrders, Error handling enabled",
    "y": 922,
    "h": 60
   },
   {
    "i": 13,
    "name": "Invoke web service",
    "y": 982,
    "h": 103
   },
   {
    "i": 14,
    "name": "End",
    "y": 1085,
    "h": 60
   },
   {
    "i": 15,
    "name": "If StatusCode <>200 then",
    "y": 1145,
    "h": 60
   },
   {
    "i": 16,
    "name": "Log message",
    "y": 1205,
    "h": 78
   },
   {
    "i": 17,
    "name": "Display message",
    "y": 1283,
    "h": 104
   },
   {
    "i": 18,
    "name": "Else",
    "y": 1387,
    "h": 60
   },
   {
    "i": 19,
    "name": "Convert JSON to custom object",
    "y": 1447,
    "h": 78
   },
   {
    "i": 20,
    "name": "Launch Excel",
    "y": 1525,
    "h": 79
   },
   {
    "i": 21,
    "name": "Add new worksheet",
    "y": 1604,
    "h": 78
   },
   {
    "i": 22,
    "name": "Set active Excel worksheet",
    "y": 1682,
    "h": 78
   },
   {
    "i": 23,
    "name": "Write to Excel worksheet",
    "y": 1760,
    "h": 78
   },
   {
    "i": 24,
    "name": "Write to Excel worksheet",
    "y": 1838,
    "h": 79
   },
   {
    "i": 25,
    "name": "Write to Excel worksheet",
    "y": 1917,
    "h": 78
   },
   {
    "i": 26,
    "name": "Write to Excel worksheet",
    "y": 1995,
    "h": 78
   },
   {
    "i": 27,
    "name": "For each Order in Orders.orders",
    "y": 2073,
    "h": 60
   },
   {
    "i": 28,
    "name": "Set variable",
    "y": 2133,
    "h": 78
   },
   {
    "i": 29,
    "name": "If OrderStatus ='cancelled' then",
    "y": 2211,
    "h": 60
   },
   {
    "i": 30,
    "name": "Add item to list",
    "y": 2271,
    "h": 79
   },
   {
    "i": 31,
    "name": "Log message",
    "y": 2350,
    "h": 78
   },
   {
    "i": 32,
    "name": "Else",
    "y": 2428,
    "h": 60
   },
   {
    "i": 33,
    "name": "Write to Excel worksheet",
    "y": 2488,
    "h": 78
   },
   {
    "i": 34,
    "name": "Write to Excel worksheet",
    "y": 2566,
    "h": 78
   },
   {
    "i": 35,
    "name": "Write to Excel worksheet",
    "y": 2644,
    "h": 79
   },
   {
    "i": 36,
    "name": "Write to Excel worksheet",
    "y": 2723,
    "h": 78
   },
   {
    "i": 37,
    "name": "Add item to list",
    "y": 2801,
    "h": 78
   },
   {
    "i": 38,
    "name": "Increase variable",
    "y": 2879,
    "h": 78
   },
   {
    "i": 39,
    "name": "Increase variable",
    "y": 2957,
    "h": 79
   },
   {
    "i": 40,
    "name": "Increase variable",
    "y": 3036,
    "h": 79
   },
   {
    "i": 41,
    "name": "End",
    "y": 3115,
    "h": 60
   },
   {
    "i": 42,
    "name": "End",
    "y": 3175,
    "h": 60
   },
   {
    "i": 43,
    "name": "Remove duplicate items from list",
    "y": 3235,
    "h": 78
   },
   {
    "i": 44,
    "name": "Sort list",
    "y": 3313,
    "h": 78
   },
   {
    "i": 45,
    "name": "Join text",
    "y": 3391,
    "h": 78
   },
   {
    "i": 46,
    "name": "Convert number to text",
    "y": 3469,
    "h": 79
   },
   {
    "i": 47,
    "name": "Add new worksheet",
    "y": 3548,
    "h": 78
   },
   {
    "i": 48,
    "name": "Set active Excel worksheet",
    "y": 3626,
    "h": 78
   },
   {
    "i": 49,
    "name": "Write to Excel worksheet",
    "y": 3704,
    "h": 78
   },
   {
    "i": 50,
    "name": "Write to Excel worksheet",
    "y": 3782,
    "h": 79
   },
   {
    "i": 51,
    "name": "Write to Excel worksheet",
    "y": 3861,
    "h": 78
   },
   {
    "i": 52,
    "name": "Write to Excel worksheet",
    "y": 3939,
    "h": 78
   },
   {
    "i": 53,
    "name": "Write to Excel worksheet",
    "y": 4017,
    "h": 78
   },
   {
    "i": 54,
    "name": "Write to Excel worksheet",
    "y": 4095,
    "h": 79
   },
   {
    "i": 55,
    "name": "Close Excel",
    "y": 4174,
    "h": 78
   },
   {
    "i": 56,
    "name": "Join text",
    "y": 4252,
    "h": 78
   },
   {
    "i": 57,
    "name": "Write text to file",
    "y": 4330,
    "h": 78
   },
   {
    "i": 58,
    "name": "Log message",
    "y": 4408,
    "h": 79
   },
   {
    "i": 59,
    "name": "Display message",
    "y": 4487,
    "h": 104
   },
   {
    "i": 60,
    "name": "End",
    "y": 4591,
    "h": 60
   }
  ],
  "badge": {
   "y": 104,
   "w": 44,
   "h": 44,
   "color": "#F3F2F1",
   "x": 1880
  }
 }
};
