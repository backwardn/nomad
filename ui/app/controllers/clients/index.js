import { alias } from '@ember/object/computed';
import Controller, { inject as controller } from '@ember/controller';
import { computed } from '@ember/object';
import { scheduleOnce } from '@ember/runloop';
import intersection from 'lodash.intersection';
import Sortable from 'nomad-ui/mixins/sortable';
import Searchable from 'nomad-ui/mixins/searchable';
import { serialize, deserializedQueryParam as selection } from 'nomad-ui/utils/qp-serialize';

export default Controller.extend(Sortable, Searchable, {
  clientsController: controller('clients'),

  nodes: alias('model.nodes'),
  agents: alias('model.agents'),

  queryParams: {
    currentPage: 'page',
    searchTerm: 'search',
    sortProperty: 'sort',
    sortDescending: 'desc',
    qpClass: 'class',
    qpStatus: 'status',
    qpDatacenter: 'dc',
    qpFlags: 'flags',
  },

  currentPage: 1,
  pageSize: 8,

  sortProperty: 'modifyIndex',
  sortDescending: true,

  searchProps: computed(() => ['id', 'name', 'datacenter']),

  qpClass: '',
  qpStatus: '',
  qpDatacenter: '',
  qpFlags: '',

  selectionClass: selection('qpClass'),
  selectionStatus: selection('qpStatus'),
  selectionDatacenter: selection('qpDatacenter'),
  selectionFlags: selection('qpFlags'),

  optionsClass: computed('nodes.[]', function() {
    const classes = Array.from(new Set(this.get('nodes').mapBy('nodeClass'))).compact();

    // Remove any invalid node classes from the query param/selection
    scheduleOnce('actions', () => {
      this.set('qpClass', serialize(intersection(classes, this.get('selectionClass'))));
    });

    return classes.sort().map(dc => ({ key: dc, label: dc }));
  }),

  optionsStatus: computed(() => [
    { key: 'initializing', label: 'Initializing' },
    { key: 'ready', label: 'Ready' },
    { key: 'down', label: 'Down' },
  ]),

  optionsDatacenter: computed('nodes.[]', function() {
    const datacenters = Array.from(new Set(this.get('nodes').mapBy('datacenter'))).compact();

    // Remove any invalid datacenters from the query param/selection
    scheduleOnce('actions', () => {
      this.set(
        'qpDatacenter',
        serialize(intersection(datacenters, this.get('selectionDatacenter')))
      );
    });

    return datacenters.sort().map(dc => ({ key: dc, label: dc }));
  }),

  optionsFlags: computed(() => [
    { key: 'ineligible', label: 'Ineligible' },
    { key: 'draining', label: 'Draining' },
  ]),

  filteredNodes: computed(
    'nodes.[]',
    'selectionClass',
    'selectionStatus',
    'selectionDatacenter',
    'selectionFlags',
    function() {
      const {
        selectionClass: classes,
        selectionStatus: statuses,
        selectionDatacenter: datacenters,
        selectionFlags: flags,
      } = this.getProperties(
        'selectionClass',
        'selectionStatus',
        'selectionDatacenter',
        'selectionFlags'
      );

      const onlyIneligible = flags.includes('ineligible');
      const onlyDraining = flags.includes('draining');

      return this.get('nodes').filter(node => {
        if (classes.length && !classes.includes(node.get('nodeClass'))) return false;
        if (statuses.length && !statuses.includes(node.get('status'))) return false;
        if (datacenters.length && !datacenters.includes(node.get('datacenter'))) return false;

        if (onlyIneligible && node.get('isEligible')) return false;
        if (onlyDraining && !node.get('isDraining')) return false;

        return true;
      });
    }
  ),

  listToSort: alias('filteredNodes'),
  listToSearch: alias('listSorted'),
  sortedNodes: alias('listSearched'),

  isForbidden: alias('clientsController.isForbidden'),

  setFacetQueryParam(queryParam, selection) {
    this.set(queryParam, serialize(selection));
  },

  actions: {
    gotoNode(node) {
      this.transitionToRoute('clients.client', node);
    },
  },
});
